import logging
import datetime
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

def write_objects(worksheet, objects, existing_ids):
    """Write objects to sheet. Update existing, append new."""
    stats = {'added': 0, 'updated': 0}
    
    new_rows = []
    
    for obj in objects:
        source_id = str(obj['source_id'])
        row_data = [obj.get(SHEET_HEADERS[col], '') for col in sorted(SHEET_HEADERS.keys())]
        
        if source_id in existing_ids:
            # Update existing row (only columns A-V)
            row_idx = existing_ids[source_id]
            try:
                # Update range explicitly
                range_str = f"A{row_idx}:V{row_idx}"
                worksheet.update(range_str, [row_data])
                stats['updated'] += 1
            except Exception as e:
                logger.error(f"Failed to update row {row_idx} for id {source_id}: {e}")
        else:
            # Append new
            new_rows.append(row_data)
            stats['added'] += 1
            
    if new_rows:
        try:
            worksheet.append_rows(new_rows, value_input_option='USER_ENTERED')
            logger.info(f"Appended {len(new_rows)} new rows.")
        except Exception as e:
            logger.error(f"Failed to append new rows: {e}")
            
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
