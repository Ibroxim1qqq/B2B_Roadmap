import os
import time
import json
import logging
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from config import ENDPOINTS, FILTER_PARAMS, RATE_LIMIT_DELAY, UZBEKISTAN_REGIONS
from sheets_writer import connect, get_existing_ids, write_objects, ensure_headers, create_settings_sheet, create_sync_log_sheet, log_sync

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_session():
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

def fetch_object_list(session, country_id=None):
    url = ENDPOINTS['list-construction']
    params = dict(FILTER_PARAMS)
    if country_id is not None:
        params['country_id'] = country_id
        reg = UZBEKISTAN_REGIONS.get(country_id, {})
        reg_name = reg.get('name', 'Region ' + str(country_id))
        logger.info('Fetching object list for: ' + reg_name)
    else:
        logger.info('Fetching object list for all 14 regions of Uzbekistan...')

    response = session.post(url, json=params)
    response.raise_for_status()
    data = response.json()
    return data.get('data', [])

def fetch_object_details(session, object_id):
    url = ENDPOINTS['get-gasn-info']
    response = session.post(url, json={'object_id': object_id})
    response.raise_for_status()
    result = response.json()
    return result.get('data', result)

def extract_max_floor(blocks):
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
    blocks = data.get('blocks', [])
    floors = extract_max_floor(blocks)
    status_dict = data.get('status', {}) if isinstance(data.get('status'), dict) else {}
    conclusion = data.get('conclusion', {}) if isinstance(data.get('conclusion'), dict) else {}
    
    return {
        'source_id': str(data.get('id', '')),
        'object_name': data.get('name', ''),
        'region_soato': str(data.get('region_soato', '')),
        'district_soato': str(data.get('district_soato', '')),
        'address': data.get('location_building', ''),
        'latitude': str(data.get('lat', '')),
        'longitude': str(data.get('long', '')),
        'status': status_dict.get('name', 'Qurilish jarayonida'),
        'status_id': str(status_dict.get('id', '2')),
        'sphere_id': str(data.get('sphere_id', '57')),
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
        'source_url': 'https://api-nazorat.mc.uz/object-info/' + str(data.get('task_id', '')) if data.get('task_id') else ''
    }

def backup_sheet(worksheet):
    try:
        backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_path = os.path.join(backup_dir, 'backup_' + timestamp + '.json')
        all_vals = worksheet.get_all_values()
        if all_vals:
            headers = all_vals[0]
            rows = [dict(zip(headers, row)) for row in all_vals[1:]]
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump({'timestamp': timestamp, 'count': len(rows), 'rows': rows}, f, ensure_ascii=False, indent=2)
            logger.info('🛡️ Pre-sync backup created: ' + backup_path + ' (' + str(len(rows)) + ' rows)')
            return backup_path
    except Exception as e:
        logger.warning('Backup creation warning: ' + str(e))
    return None

def update_local_cache(worksheet):
    try:
        cache_path = os.path.join(os.path.dirname(__file__), '..', 'web', 'src', 'lib', 'real-sheets-data.json')
        if os.path.exists(os.path.dirname(cache_path)):
            all_vals = worksheet.get_all_values()
            if all_vals:
                headers = all_vals[0]
                rows = [dict(zip(headers, row)) for row in all_vals[1:]]
                payload = {
                    'timestamp': datetime.now().isoformat(),
                    'count': len(rows),
                    'rows': rows
                }
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                logger.info('Updated local cache: ' + cache_path + ' with ' + str(len(rows)) + ' rows')
    except Exception as e:
        logger.warning('Local cache update warning: ' + str(e))

def main():
    parser = argparse.ArgumentParser(description='Data collector for Uzbekistan Construction Map')
    parser.add_argument('--region', type=str, default='all', help='Region ID (1-14) or all for all Uzbekistan')
    parser.add_argument('--dry-run', action='store_true', help='Fetch data but do not write to Sheets')
    parser.add_argument('--limit', type=int, help='Only process first N objects (for testing)')
    parser.add_argument('--workers', type=int, default=6, help='Parallel worker threads (default: 6)')
    parser.add_argument('--json', action='store_true', help='Output collected data as JSON to stdout')
    parser.add_argument('--verbose', action='store_true', help='Detailed logging')
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    session = get_session()
    country_id = None
    if args.region.lower() != 'all':
        try:
            country_id = int(args.region)
        except ValueError:
            logger.error('Invalid region argument: ' + args.region + '. Must be 1-14 or all')
            return

    try:
        obj_list = fetch_object_list(session, country_id=country_id)
        logger.info('Found ' + str(len(obj_list)) + ' objects in DSHK list')
        
        if args.limit:
            obj_list = obj_list[:args.limit]
            logger.info('Limiting to first ' + str(args.limit) + ' objects')

        total_count = len(obj_list)
        logger.info('Starting multi-threaded fetching with ' + str(args.workers) + ' workers for ' + str(total_count) + ' objects...')

        objects = []
        failed_count = 0
        lock = threading.Lock()
        completed_count = 0

        def fetch_single(item):
            nonlocal completed_count, failed_count
            obj_id = item.get('object_id')
            if not obj_id:
                with lock:
                    failed_count += 1
                return None

            try:
                details = fetch_object_details(session, obj_id)
                transformed = transform_data(details)
                with lock:
                    completed_count += 1
                    objects.append(transformed)
                    if completed_count % 50 == 0 or completed_count == total_count:
                        pct = completed_count * 100 // max(1, total_count)
                        logger.info('[' + str(completed_count) + '/' + str(total_count) + '] (' + str(pct) + '%) ' + transformed.get('object_name', '')[:40])
                return transformed
            except Exception as e:
                with lock:
                    failed_count += 1
                logger.debug('Failed to fetch object ' + str(obj_id) + ': ' + str(e))
                return None

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = [executor.submit(fetch_single, item) for item in obj_list]
            for future in as_completed(futures):
                future.result()

        logger.info('Fetching complete: ' + str(len(objects)) + ' successful, ' + str(failed_count) + ' failed out of ' + str(total_count))

        if args.json:
            print(json.dumps(objects, indent=2, ensure_ascii=False))

        if args.dry_run:
            logger.info('Dry run enabled. Skipping write to Google Sheets.')
            return

        credentials_path = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
        sheet_id = os.getenv('GOOGLE_SHEETS_ID')
        
        if not credentials_path or not sheet_id:
            logger.error('GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEETS_ID must be set in .env')
            return

        if not os.path.isabs(credentials_path) and not os.path.exists(credentials_path):
            candidate = os.path.join(os.path.dirname(__file__), credentials_path)
            if os.path.exists(candidate):
                credentials_path = candidate

        logger.info('Connecting to Google Sheets...')
        spreadsheet = connect(credentials_path, sheet_id)
        worksheet = spreadsheet.sheet1
        
        backup_sheet(worksheet)
        ensure_headers(worksheet)
        create_settings_sheet(spreadsheet)
        create_sync_log_sheet(spreadsheet)
        
        existing_ids = get_existing_ids(worksheet)
        logger.info('Sheet currently has ' + str(len(existing_ids)) + ' existing rows')
        
        write_stats = write_objects(worksheet, objects, existing_ids)
        stats = {
            'total': total_count,
            'added': write_stats['added'],
            'updated': write_stats['updated'],
            'failed': failed_count
        }
        
        log_sync(spreadsheet, stats)
        update_local_cache(worksheet)
        logger.info('Sync complete! Summary: Added=' + str(stats['added']) + ', Updated=' + str(stats['updated']) + ', Failed=' + str(stats['failed']))

    except Exception as e:
        logger.error('An error occurred during execution: ' + str(e))

if __name__ == '__main__':
    main()
