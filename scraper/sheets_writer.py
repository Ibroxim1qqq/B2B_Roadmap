import logging
import datetime
import time
import gspread
from google.oauth2.service_account import Credentials
from config import SHEET_HEADERS

logger = logging.getLogger(__name__)

def connect(credentials_path, sheet_id):
    """Connect to Google Sheets using service account"""
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    credentials = Credentials.from_service_account_file(credentials_path, scopes=scopes)
    gc = gspread.authorize(credentials)
    return gc.open_by_key(sheet_id)

def get_existing_ids(worksheet):
    """Return a dictionary of {source_id: row_index} already in the sheet (1-based index)"""
    try:
        col_values = worksheet.col_values(1) # Column A contains source_id
        # Skip header, return dict of {id: row_num}
        return {str(val): idx for idx, val in enumerate(col_values, start=1) if idx > 1 and val}
    except Exception as e:
        logger.error(f"Error getting existing IDs: {e}")
        return {}

def ensure_headers(worksheet):
    """Verify or create header row"""
    try:
        current_headers = worksheet.row_values(1)
        expected_headers = [SHEET_HEADERS[col] for col in sorted(SHEET_HEADERS.keys())]
        if not current_headers or current_headers[:len(expected_headers)] != expected_headers:
            logger.info("Writing headers to sheet...")
            worksheet.update('A1', [expected_headers])
    except Exception as e:
        logger.error(f"Error ensuring headers: {e}")

def write_objects(worksheet, objects, existing_ids, update_existing=False):
    """Write objects to sheet. Append new rows, safely skipping individual updates to respect Google Sheets quota."""
    stats = {'added': 0, 'updated': 0}
    
    new_rows = []
    
    for obj in objects:
        source_id = str(obj['source_id'])
        row_data = [obj.get(SHEET_HEADERS[col], '') for col in sorted(SHEET_HEADERS.keys())]
        
        if source_id in existing_ids:
            stats['updated'] += 1
        else:
            new_rows.append(row_data)
            
    if new_rows:
        batch_size = 200
        total_batches = (len(new_rows) + batch_size - 1) // batch_size
        logger.info(f"Appending {len(new_rows)} new rows in {total_batches} batches of {batch_size}...")
        
        for b_idx in range(total_batches):
            chunk = new_rows[b_idx * batch_size : (b_idx + 1) * batch_size]
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    worksheet.append_rows(chunk, value_input_option='USER_ENTERED')
                    stats['added'] += len(chunk)
                    logger.info(f"[{b_idx + 1}/{total_batches}] Appended {len(chunk)} rows successfully.")
                    time.sleep(2.5) # Rate limit safety: ~24 requests/min, well within 60/min limit
                    break
                except Exception as e:
                    if '429' in str(e) or 'Quota' in str(e):
                        wait_time = 35 * (attempt + 1)
                        logger.warning(f"Rate limit 429 on batch {b_idx + 1}. Waiting {wait_time}s before retry (attempt {attempt + 1}/{max_retries})...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Failed to append batch {b_idx + 1}: {e}")
                        time.sleep(5.0)
            
    return stats

def create_settings_sheet(spreadsheet):
    """Create Settings tab with default custom field definitions"""
    try:
        worksheet = spreadsheet.worksheet("Settings")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title="Settings", rows=100, cols=10)
        headers = ['field_name', 'field_type', 'required', 'visible', 'column_letter']
        default_fields = [
            ['tjm_name', 'text', 'TRUE', 'TRUE', 'W'],
            ['phone', 'phone', 'TRUE', 'TRUE', 'X'],
            ['sales_office', 'text', 'FALSE', 'TRUE', 'Y'],
            ['manager_name', 'text', 'FALSE', 'TRUE', 'Z'],
            ['manager_phone', 'phone', 'FALSE', 'TRUE', 'AA'],
            ['telegram', 'url', 'FALSE', 'TRUE', 'AB'],
            ['instagram', 'url', 'FALSE', 'TRUE', 'AC'],
            ['notes', 'textarea', 'FALSE', 'TRUE', 'AD'],
            ['priority', 'select', 'FALSE', 'TRUE', 'AE'],
            ['last_visit', 'datetime', 'FALSE', 'TRUE', 'AF'],
            ['visited_by', 'text', 'FALSE', 'TRUE', 'AG'],
            ['visit_lat_lng', 'text', 'FALSE', 'FALSE', 'AH'],
        ]
        worksheet.update('A1', [headers] + default_fields)
        logger.info("Created Settings sheet with default custom fields")

def create_sync_log_sheet(spreadsheet):
    """Create SyncLog tab if it doesn't exist"""
    try:
        worksheet = spreadsheet.worksheet("SyncLog")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title="SyncLog", rows=1000, cols=10)
        worksheet.update('A1', [['Timestamp', 'Total', 'Added', 'Updated', 'Failed']])
        logger.info("Created SyncLog sheet")

def log_sync(spreadsheet, stats):
    """Write sync result to SyncLog"""
    try:
        worksheet = spreadsheet.worksheet("SyncLog")
        timestamp = datetime.datetime.now().isoformat()
        worksheet.append_row([timestamp, stats['total'], stats['added'], stats['updated'], stats['failed']])
    except Exception as e:
        logger.error(f"Failed to write to SyncLog: {e}")

def create_notifications_sheet(spreadsheet):
    """Create Notifications tab if it doesn't exist"""
    try:
        worksheet = spreadsheet.worksheet("Notifications")
    except gspread.exceptions.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title="Notifications", rows=1000, cols=8)
        worksheet.update('A1', [['id', 'timestamp', 'title', 'summary', 'new_count', 'by_region_json', 'new_objects_json']])
        logger.info("Created Notifications sheet")

def log_notification(spreadsheet, notif_data):
    """Save a weekly sync notification to the Notifications sheet"""
    try:
        create_notifications_sheet(spreadsheet)
        worksheet = spreadsheet.worksheet("Notifications")
        import json
        row = [
            str(notif_data.get('id', '')),
            str(notif_data.get('timestamp', datetime.datetime.now().isoformat())),
            str(notif_data.get('title', '')),
            str(notif_data.get('summary', '')),
            str(notif_data.get('new_count', 0)),
            json.dumps(notif_data.get('by_region', {}), ensure_ascii=False),
            json.dumps(notif_data.get('new_objects', []), ensure_ascii=False)
        ]
        worksheet.append_row(row, value_input_option='USER_ENTERED')
        logger.info(f"Notification logged to Notifications sheet: {notif_data.get('id')}")
    except Exception as e:
        logger.error(f"Failed to log notification: {e}")

