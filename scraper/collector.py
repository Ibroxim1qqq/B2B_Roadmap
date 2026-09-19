import os
import time
import json
import logging
import argparse
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from config import ENDPOINTS, FILTER_PARAMS, RATE_LIMIT_DELAY
from sheets_writer import connect, get_existing_ids, write_objects, ensure_headers, create_settings_sheet, create_sync_log_sheet, log_sync

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_session():
    """Setup requests session with retries and exponential backoff"""
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

def fetch_object_list(session):
    """Fetch the list of construction objects"""
    logger.info("Fetching object list...")
    url = ENDPOINTS['list-construction']
    response = session.post(url, json=FILTER_PARAMS)
    response.raise_for_status()
    data = response.json()
    return data.get('data', [])

def fetch_object_details(session, object_id):
    """Fetch details for a specific object"""
    url = ENDPOINTS['get-gasn-info']
    response = session.post(url, json={"object_id": object_id})
    response.raise_for_status()
    result = response.json()
    return result.get('data', result)  # API returns {data: {...}}

def extract_max_floor(blocks):
    """Extract max floor from blocks array"""
    if not blocks:
        return 0
    max_floor = 0
    for block in blocks:
        try:
            floor = int(block.get('floor', 0))
            if floor > max_floor:
                max_floor = floor
        except (ValueError, TypeError):
            continue
    return max_floor

def transform_data(data):
    """Transform API response into a flat dictionary matching sheet columns"""
    blocks = data.get('blocks', [])
    floors = extract_max_floor(blocks)
    status_dict = data.get('status', {})
    conclusion = data.get('conclusion', {})
    
    return {
        'source_id': str(data.get('id', '')),
        'object_name': data.get('name', ''),
        'region_soato': str(data.get('region_soato', '')),
        'district_soato': str(data.get('district_soato', '')),
        'address': data.get('location_building', ''),
        'latitude': str(data.get('lat', '')),
        'longitude': str(data.get('long', '')),
        'status': status_dict.get('name', ''),
        'status_id': str(status_dict.get('id', '')),
        'sphere_id': str(data.get('sphere_id', '')),
        'customer': data.get('organization_name', ''),
        'designer': data.get('loyiha', ''),
        'builder': data.get('pudrat', ''),
        'difficulty': str(data.get('difficulty', '')),
        'floors': str(floors),
        'apartment_count': str(data.get('apartment_count', '')),
        'block_count': str(data.get('block_count', '')),
        'deadline': data.get('deadline', ''),
        'created_at': data.get('created_at', ''),
        'task_id': str(data.get('task_id', '')),
        'passport_url': conclusion.get('url', '') if conclusion else '',
        'source_url': f"https://api-nazorat.mc.uz/object-info/{data.get('task_id', '')}" if data.get('task_id') else ''
    }

def main():
    parser = argparse.ArgumentParser(description="Data collector for B2B Samarqand Construction Map")
    parser.add_argument('--dry-run', action='store_true', help="Fetch data but don't write to Sheets")
    parser.add_argument('--limit', type=int, help="Only process first N objects (for testing)")
    parser.add_argument('--json', action='store_true', help="Output collected data as JSON to stdout")
    parser.add_argument('--verbose', action='store_true', help="Detailed logging")
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    session = get_session()
    objects = []
    stats = {'added': 0, 'updated': 0, 'failed': 0, 'total': 0}

    try:
        obj_list = fetch_object_list(session)
        logger.info(f"Found {len(obj_list)} objects in the list")
        
        if args.limit:
            obj_list = obj_list[:args.limit]
            logger.info(f"Limiting to first {args.limit} objects")

        stats['total'] = len(obj_list)

        for idx, obj in enumerate(obj_list, 1):
            obj_id = obj.get('object_id')
            if not obj_id:
                stats['failed'] += 1
                logger.warning(f"[{idx}/{len(obj_list)}] Skipping object without object_id")
                continue

            try:
                logger.debug(f"[{idx}/{len(obj_list)}] Fetching details for object {obj_id}")
                time.sleep(RATE_LIMIT_DELAY)
                
                details = fetch_object_details(session, obj_id)
                transformed = transform_data(details)
                objects.append(transformed)
                logger.info(f"[{idx}/{len(obj_list)}] Successfully fetched {transformed['object_name']}")
            except Exception as e:
                stats['failed'] += 1
                logger.error(f"[{idx}/{len(obj_list)}] Failed to fetch/transform object {obj_id}: {e}")

        if args.json:
            print(json.dumps(objects, indent=2, ensure_ascii=False))

        if args.dry_run:
            logger.info("Dry run enabled. Skipping write to Google Sheets.")
            logger.info(f"Stats: Fetched {len(objects)} successfully, Failed: {stats['failed']}")
            return

        # Google Sheets integration
        credentials_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
        sheet_id = os.getenv('GOOGLE_SHEETS_ID')
        
        if not credentials_path or not sheet_id:
            logger.error("GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEETS_ID must be set in .env")
            return

        logger.info("Connecting to Google Sheets...")
        spreadsheet = connect(credentials_path, sheet_id)
        worksheet = spreadsheet.sheet1
        
        ensure_headers(worksheet)
        create_settings_sheet(spreadsheet)
        create_sync_log_sheet(spreadsheet)
        
        existing_ids = get_existing_ids(worksheet)
        write_stats = write_objects(worksheet, objects, existing_ids)
        
        stats['added'] = write_stats['added']
        stats['updated'] = write_stats['updated']
        
        log_sync(spreadsheet, stats)
        
        logger.info(f"Sync complete! Summary: Total={stats['total']}, Added={stats['added']}, Updated={stats['updated']}, Failed={stats['failed']}")

    except Exception as e:
        logger.error(f"An error occurred during execution: {e}")

if __name__ == "__main__":
    main()
