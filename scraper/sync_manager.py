import sys
import json
import gspread
from google.oauth2.service_account import Credentials

CREDENTIALS_FILE = "credentials.json"
SHEET_ID = "1ZmPUfae89OAiK4kJykrL4O3XaSrYUK8KoJlmCjYhzKA"

INTERNAL_COLUMNS = [
    'tjm_name', 'phone', 'sales_office', 'manager_name', 
    'manager_phone', 'telegram', 'instagram', 'notes', 
    'priority', 'last_visit', 'visited_by', 'visit_lat_lng'
]

def get_sheet():
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    return sh.sheet1

def export_all_objects():
    ws = get_sheet()
    values = ws.get_all_values()
    if not values:
        print(json.dumps({"success": False, "count": 0}))
        return
    
    headers = values[0]
    rows = []
    for r in values[1:]:
        padded = r + [''] * (len(headers) - len(r))
        rows.append(dict(zip(headers, padded)))
    
    # Save cache
    with open("../web/src/lib/real-sheets-data.json", "w", encoding="utf-8") as f:
        json.dump({"headers": headers, "rows": rows}, f, ensure_ascii=False, indent=2)
    
    print(json.dumps({"success": True, "count": len(rows)}))

def update_object(source_id, update_data):
    ws = get_sheet()
    values = ws.get_all_values()
    headers = values[0]
    
    id_col = headers.index("source_id") if "source_id" in headers else 0
    row_idx = None
    existing_row = None

    for i, r in enumerate(values[1:], start=2):
        if r and len(r) > id_col and str(r[id_col]).strip() == str(source_id).strip():
            row_idx = i
            existing_row = r + [''] * (len(headers) - len(r))
            break
            
    if not row_idx:
        print(json.dumps({"success": False, "error": f"Object {source_id} not found"}))
        return

    # Build the 12 internal column values (W to AH)
    # W is col 23 (index 22 in headers)
    w_index = 22
    current_internal = existing_row[w_index:w_index + len(INTERNAL_COLUMNS)] if len(existing_row) >= w_index else [''] * len(INTERNAL_COLUMNS)
    current_dict = dict(zip(INTERNAL_COLUMNS, current_internal))

    # Apply updates
    for k, v in update_data.items():
        if k in INTERNAL_COLUMNS:
            current_dict[k] = str(v) if v is not None else ''

    updated_values = [current_dict.get(k, '') for k in INTERNAL_COLUMNS]

    # Batch update single range W{row_idx}:AH{row_idx}
    range_name = f"W{row_idx}:AH{row_idx}"
    ws.update(range_name, [updated_values])

    print(json.dumps({"success": True, "row": row_idx, "updated": update_data}))

def clear_object_b2b(source_id):
    empty_data = {k: '' for k in INTERNAL_COLUMNS}
    update_object(source_id, empty_data)

def create_object(new_data):
    ws = get_sheet()
    values = ws.get_all_values()
    if not values:
        print(json.dumps({"success": False, "error": "Sheet is empty"}))
        return
    headers = values[0]
    
    source_id = str(new_data.get("source_id", "")).strip()
    if not source_id:
        import time
        source_id = f"B2B_{int(time.time())}"
        new_data["source_id"] = source_id
        
    row = [str(new_data.get(h, '') if new_data.get(h) is not None else '') for h in headers]
    ws.append_row(row, value_input_option='USER_ENTERED')
    
    # Also update local JSON cache if exists
    try:
        cache_path = "../web/src/lib/real-sheets-data.json"
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)
        
        exists = any(str(r.get("source_id")).strip() == source_id for r in cache.get("rows", []))
        if not exists:
            row_dict = dict(zip(headers, row))
            cache["rows"].insert(0, row_dict)
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        pass

    print(json.dumps({"success": True, "source_id": source_id, "data": new_data}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "export":
            export_all_objects()
        elif cmd == "update":
            sid = sys.argv[2]
            payload = sys.stdin.read().strip() if len(sys.argv) <= 3 else sys.argv[3]
            data = json.loads(payload)
            update_object(sid, data)
        elif cmd == "clear":
            sid = sys.argv[2]
            clear_object_b2b(sid)
        elif cmd == "create":
            payload = sys.stdin.read().strip() if len(sys.argv) <= 2 else sys.argv[2]
            data = json.loads(payload)
            create_object(data)
    else:
        export_all_objects()
