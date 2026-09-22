import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import requests
from dotenv import load_dotenv

# Add parent directory to path if needed
sys.path.insert(0, os.path.dirname(__file__))

from config import ENDPOINTS, FILTER_PARAMS, RATE_LIMIT_DELAY, UZBEKISTAN_REGIONS, SHEET_HEADERS
from sheets_writer import (
    connect, get_existing_ids, write_objects, ensure_headers, 
    create_settings_sheet, create_sync_log_sheet, create_notifications_sheet, log_notification
)
from collector import get_session, fetch_object_details, transform_data, backup_sheet, update_local_cache

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('weekly_sync')

NOTIFICATIONS_CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'web', 'src', 'lib', 'notifications.json')

def fetch_all_uzbekistan_objects(session):
    """
    Fetch all multi-apartment construction objects across all 14 regions of Uzbekistan
    with filter: sphere_id=57 (Ko'p xonadonli uy-joylar), status=2 (Jarayonda)
    """
    url = ENDPOINTS['list-construction']
    params = dict(FILTER_PARAMS)
    # When country_id is not supplied or None, DSHK returns objects for the entire republic
    logger.info("📡 Fetching construction objects across all 14 regions of Uzbekistan...")
    try:
        response = session.post(url, json=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        items = data.get('data', [])
        logger.info(f"✅ DSHK returned {len(items)} total objects matching criteria.")
        return items
    except Exception as e:
        logger.error(f"❌ Error fetching object list from DSHK: {e}")
        # Fallback: fetch region by region if global list fails
        all_items = []
        for reg_id, reg_info in UZBEKISTAN_REGIONS.items():
            try:
                p = dict(FILTER_PARAMS)
                p['country_id'] = reg_id
                r = session.post(url, json=p, timeout=20)
                if r.status_code == 200:
                    d = r.json().get('data', [])
                    all_items.extend(d)
                    logger.info(f"  - {reg_info['name']}: {len(d)} objects")
                time.sleep(RATE_LIMIT_DELAY)
            except Exception as reg_err:
                logger.warning(f"  - Failed for region {reg_id}: {reg_err}")
        return all_items

def save_notification_to_cache(notification):
    """Save the new notification into the web local cache notifications.json"""
    try:
        os.makedirs(os.path.dirname(NOTIFICATIONS_CACHE_FILE), exist_ok=True)
        existing = []
        if os.path.exists(NOTIFICATIONS_CACHE_FILE):
            try:
                with open(NOTIFICATIONS_CACHE_FILE, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
                    if not isinstance(existing, list):
                        existing = []
            except Exception:
                existing = []

        # Add new notification at the top (most recent first)
        existing.insert(0, notification)
        # Keep latest 30 notifications
        existing = existing[:30]

        with open(NOTIFICATIONS_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 Notification cached to {NOTIFICATIONS_CACHE_FILE}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to cache notification locally: {e}")

def run_weekly_sync(dry_run=False, limit=None, workers=6, force_sample=False):
    """
    Main weekly sync routine:
    1. Connects to Google Sheets & retrieves existing IDs
    2. Fetches current Uzbekistan dataset from DSHK API
    3. Finds new objects (Diff Engine)
    4. Fetches detailed info for new objects
    5. Appends new objects to Google Sheet
    6. Creates and records a WeeklySyncNotification
    """
    session = get_session()
    credentials_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
    sheet_id = os.getenv('GOOGLE_SHEETS_ID')

    if not credentials_path or not sheet_id:
        # Fallback to credentials.json in scraper dir
        candidate = os.path.join(os.path.dirname(__file__), 'credentials.json')
        if os.path.exists(candidate):
            credentials_path = candidate
        else:
            logger.error("❌ GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEETS_ID must be set")
            return {"success": False, "error": "Missing Google Sheets credentials"}

    logger.info("🔗 Connecting to Google Sheets...")
    spreadsheet = connect(credentials_path, sheet_id)
    worksheet = spreadsheet.sheet1

    backup_sheet(worksheet)
    ensure_headers(worksheet)
    create_settings_sheet(spreadsheet)
    create_sync_log_sheet(spreadsheet)
    create_notifications_sheet(spreadsheet)

    existing_id_dict = get_existing_ids(worksheet)
    existing_ids = set(existing_id_dict.keys())
    logger.info(f"📊 Current database has {len(existing_ids)} existing objects.")

    # 1. Fetch current DSHK list
    dshk_items = fetch_all_uzbekistan_objects(session)
    if not dshk_items:
        logger.warning("⚠️ No objects received from DSHK. Aborting sync.")
        return {"success": False, "error": "No objects received from DSHK"}

    # 2. Diff Engine: Identify newly added objects
    new_items = []
    for item in dshk_items:
        obj_id = str(item.get('object_id', ''))
        if obj_id and obj_id not in existing_ids:
            new_items.append(item)

    logger.info(f"🔍 Diff Engine result: {len(new_items)} NEW objects identified out of {len(dshk_items)} total.")

    # For testing or demonstration, if force_sample is True and no new items exist
    if not new_items and force_sample and len(dshk_items) > 0:
        logger.info("🧪 force_sample enabled: Selecting top 3 items to simulate a new weekly notification.")
        new_items = dshk_items[:3]

    if not new_items:
        logger.info("🎉 Hozircha yangi obyektlar qo'shilmagan. Baza to'liq yangilangan.")
        return {"success": True, "new_count": 0, "message": "Yangi obyektlar yo'q"}

    if limit and len(new_items) > limit:
        logger.info(f"Limiting to first {limit} new items...")
        new_items = new_items[:limit]

    # 3. Fetch detailed data for new items in parallel
    logger.info(f"🚀 Fetching full details for {len(new_items)} new objects using {workers} threads...")
    new_objects = []
    failed_count = 0
    lock = threading.Lock()

    def fetch_single(item):
        nonlocal failed_count
        obj_id = item.get('object_id')
        if not obj_id:
            return None
        try:
            details = fetch_object_details(session, obj_id)
            transformed = transform_data(details)
            with lock:
                new_objects.append(transformed)
            return transformed
        except Exception as e:
            with lock:
                failed_count += 1
            logger.debug(f"Failed to fetch details for {obj_id}: {e}")
            return None

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(fetch_single, item) for item in new_items]
        for future in as_completed(futures):
            future.result()

    logger.info(f"✅ Fetched details: {len(new_objects)} success, {failed_count} failed.")

    if not new_objects:
        logger.warning("No object details successfully retrieved.")
        return {"success": False, "error": "Could not fetch details for new objects"}

    # 4. Save to Google Sheets if not dry run
    if not dry_run:
        logger.info(f"📝 Appending {len(new_objects)} new objects to Google Sheet...")
        write_stats = write_objects(worksheet, new_objects, existing_id_dict)
        logger.info(f"✅ Appended to sheet: {write_stats.get('added', 0)} new rows.")
        update_local_cache(worksheet)
    else:
        logger.info("🧪 Dry run enabled - skipped writing to Google Sheets.")

    # 5. Build Notification
    # Group counts by region_soato
    by_region = {}
    for obj in new_objects:
        soato = str(obj.get('region_soato', '')).strip()
        by_region[soato] = by_region.get(soato, 0) + 1

    now_iso = datetime.now().isoformat()
    now_str = datetime.now().strftime('%d-%m-%Y %H:%M')
    notif_id = f"notif_{int(time.time())}"
    title = f"Haftalik yangilanish: {len(new_objects)} ta yangi ko'p qavatli bino aniqlandi"
    summary = f"O'zbekiston bo'ylab ko'p xonadonli uy-joylar monitoringi: {len(new_objects)} ta yangi bino bazaga qo'shildi ({now_str})."

    # Simplify objects preview for notification
    preview_objects = []
    for obj in new_objects:
        preview_objects.append({
            'source_id': obj.get('source_id', ''),
            'object_name': obj.get('object_name', ''),
            'region_soato': obj.get('region_soato', ''),
            'district_soato': obj.get('district_soato', ''),
            'address': obj.get('address', ''),
            'latitude': float(obj['latitude']) if obj.get('latitude') and obj['latitude'] != 'None' else 0,
            'longitude': float(obj['longitude']) if obj.get('longitude') and obj['longitude'] != 'None' else 0,
            'floors': obj.get('floors', ''),
            'apartment_count': obj.get('apartment_count', ''),
            'customer': obj.get('customer', ''),
            'builder': obj.get('builder', ''),
            'created_at': obj.get('created_at', now_iso)
        })

    notification_data = {
        'id': notif_id,
        'title': title,
        'summary': summary,
        'timestamp': now_iso,
        'new_count': len(new_objects),
        'by_region': by_region,
        'new_objects': preview_objects,
        'is_read': False
    }

    # 6. Save Notification
    if not dry_run:
        log_notification(spreadsheet, notification_data)
    save_notification_to_cache(notification_data)

    logger.info(f"🔔 Notification generated and dispatched successfully! ID: {notif_id}")
    return {
        "success": True,
        "notification_id": notif_id,
        "new_count": len(new_objects),
        "by_region": by_region
    }

def main():
    parser = argparse.ArgumentParser(description="Weekly Uzbekistan Construction Scraper & Notifier")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and diff without writing to sheet")
    parser.add_argument("--limit", type=int, help="Limit number of new objects to process")
    parser.add_argument("--workers", type=int, default=6, help="Worker threads")
    parser.add_argument("--force-sample", action="store_true", help="Generate sample notification even if no new items")
    args = parser.parse_args()

    result = run_weekly_sync(
        dry_run=args.dry_run,
        limit=args.limit,
        workers=args.workers,
        force_sample=args.force_sample
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
