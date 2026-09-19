import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { dataCache } from './dataCache';

export const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ZmPUfae89OAiK4kJykrL4O3XaSrYUK8KoJlmCjYhzKA';

export const SOURCE_COLUMNS = [
  'source_id', 'object_name', 'region_soato', 'district_soato', 
  'address', 'latitude', 'longitude', 'status', 'status_id', 
  'sphere_id', 'customer', 'designer', 'builder', 'difficulty', 
  'floors', 'apartment_count', 'block_count', 'deadline', 
  'created_at', 'task_id', 'passport_url', 'source_url'
];

export const INTERNAL_COLUMNS = [
  'tjm_name', 'phone', 'sales_office', 'manager_name', 
  'manager_phone', 'telegram', 'instagram', 'notes', 
  'priority', 'last_visit', 'visited_by', 'visit_lat_lng'
];

const DEFAULT_SERVICE_ACCOUNT = {
  client_email: "scraper@b2b-samarqand.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMI8EV+wRfxy2Q\nmLlI+am2RSxPiE3pE+Rfe/tqRx+6NSnn9St5nYJVACTQR6Y/ElteMo8d8Z81gabh\n55BnqGZKOFOG7O/iHVwyrebpCbKwVbhxEiPU0uL4oCH0H0sHABZv1SW0ezwc5mL2\n6+xvN3xO/ggZ3WB5OeYum1fFQ9oroM4kd3l7GbpbDlUMmdNOFi/0EeKYAA1k3FZd\nSO1c3y8Bkmay3uj6OsLDz2u6AJq5Hx/2pSaw8ZhOwtoR1OC/S+Nr8v/hIQsiNniO\nmOePkLeKpr7RiLJjWY3xHHbkzdTf7LtnyZGY9i76mx/hmNgQFjDFklZ1Q3fmps3D\nOdmlDl8NAgMBAAECggEABBcV+N9wreKZUnOyQOqBd8hYzrckNrXD/Wo53V4oyM2r\n5CsCgKe/fBpKMMMJa0DDko9gVH9DFgqzNYTdldYcYwNskedJbWDWG9stCQT2R9De\nGIepLswEsKN72OXk8rlnR+euEQ4g1f0t9uM/Pp3j/NdpupWbYJJu21w0jqqdl8m1\n0+baVMqrF+zlFWlCf9/tyKj+314zMxyWskX1iK1ggMC4LiAGc6AO8PBihc5CpZ+d\nv79sJgZK7YRsg15atF/fYob8MHPKWFxG5R/pP57Xeu62NklnO8EKkszwTXqBn/vl\nJciz230hBLA+tFxyXXWUUVSpCAPkenCj3p9IKGSQgQKBgQD9UPPkm1RFQb2cS7Sl\n4iXtp2lAjyCq7Vtpksi8F8wvISWmzZ+yRxtedfDh79Y/aFp2mcJS27T4TZjBaw9Y\nxmXh9sMpgMzT+CF9t4S2a/BJqGlrSMc/jSi+0A0aaDl+ujesK1fAlSVKp2D9gbfr\nwMxZmV5xEF/A83z4Qf8QeHGynQKBgQDOTWyeK96bipDcWWocsbFgS2x18mUk84mV\ndKKhDQ1ltJpRTHKGyWvrzLj+ru96ZrmxakLlfKPwlJdwglcr2pbbV3Aev/3jm1bC\nreTldQ7G3xUztpSdi32D0ep+i15QM/e7E8r1wmvkXFa3YG8ZmfIyXXHHSEn+EOHQ\nGmod2VU7MQKBgQDOjPmxyC34otg230wXjsUaeU1LROmANjY5aWSgak8lhsOqtTOo\nLG7WoRifQe7SmQZaepmG8nsnlC4gWGmVG4DrtUgBSXK6zDKSzdc639x4UwhSYG+H\nFFTK8d4dUCrBeJn4mwbck0BrFPvy+Zi8dOKrlHD7hDxvmpql2zpddbhPyQKBgArl\n4CUC4EGLMlfRiV92q44QrewVH+6xxsTUYnrre5ex0K0Wwr4ICeFs8SDTEOeAYbLT\nkDEbQnXFA7L3z68LXwi7N7sIHVtWq2ChWwQcCOnMgww2Sud/pOO/xQlmR1cpR57k\nTsZovNZVYmdResz5aufqM8Z5NR9suOELZCurfWshAoGBAPKZZEcSMtfN7oTKqjM4\n0xivwKaNQ8Kz46WnGSSSPo7lJA6Ney2nqZYsGC8J4qjPLaJRh41UjQudHk+G0LTC\n0H6xySAVas5WCnRMhIrmrn9OrCsystJMtS0oF43uclObqlX4X3I2dKQBHFoWHU+X\nw2f2adiA8biI4HTB9WD12pZJ\n-----END PRIVATE KEY-----\n"
};

/**
 * Convert 0-based column index to A1 notation letter (0 -> A, 25 -> Z, 26 -> AA, 33 -> AH)
 */
export function colToA1(index: number): string {
  let temp = index + 1;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (!email && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      email = parsed.client_email;
      privateKey = parsed.private_key;
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  if (!email || !privateKey) {
    email = DEFAULT_SERVICE_ACCOUNT.client_email;
    privateKey = DEFAULT_SERVICE_ACCOUNT.private_key;
  }

  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  const auth = new google.auth.JWT({
    email: email.trim(),
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

let cachedPrimarySheetTitle: string | null = null;

/**
 * Dynamically find the main data sheet title (e.g. 'Varaq1' or 'Objects')
 */
export async function getPrimarySheetName(sheets: any): Promise<string> {
  if (cachedPrimarySheetTitle) return cachedPrimarySheetTitle;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const titles: string[] = (meta.data.sheets || []).map((s: any) => s.properties?.title);
    if (titles.includes('Varaq1')) {
      cachedPrimarySheetTitle = 'Varaq1';
    } else if (titles.includes('Objects')) {
      cachedPrimarySheetTitle = 'Objects';
    } else if (titles.length > 0) {
      cachedPrimarySheetTitle = titles[0];
    } else {
      cachedPrimarySheetTitle = 'Varaq1';
    }
  } catch (e) {
    cachedPrimarySheetTitle = 'Varaq1';
  }
  return cachedPrimarySheetTitle;
}

/**
 * Fetch all objects from Google Sheet (without arbitrary row limits)
 * Populates in-memory cache and writes to local backup file if writable
 */
export async function exportAllObjectsFromSheet() {
  const sheets = await getSheetsClient();
  const tab = await getPrimarySheetName(sheets);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!A1:ZZ`
  });

  const values = res.data.values || [];
  if (values.length <= 1) {
    return { success: false, count: 0, rows: [], headers: [] };
  }

  const headers: string[] = values[0];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    // Skip empty trailing rows
    if (!r || !r[0] || String(r[0]).trim() === '') continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]).trim() : '';
    });
    rows.push(rowObj);
  }

  // Update synchronized shared in-memory cache
  dataCache.setAll(headers, rows);

  // Update local disk cache if writable (safe fallback)
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    fs.writeFileSync(filePath, JSON.stringify({ headers, rows }, null, 2), 'utf-8');
  } catch (e) {
    // Read-only filesystem in production, harmless
  }

  return { success: true, count: rows.length, headers, rows };
}

/**
 * Update internal B2B and custom columns for an object in Google Sheet
 * Strictly guarantees source data columns are never lost or corrupted!
 */
export async function updateObjectInSheet(sourceId: string, updateData: Record<string, any>) {
  const sheets = await getSheetsClient();
  const tab = await getPrimarySheetName(sheets);

  // 1. Fetch full existing data with headers from sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!A1:ZZ`
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) {
    throw new Error('Google Sheet is empty');
  }

  let headers: string[] = [...(rows[0] || [])];
  const idCol = headers.indexOf('source_id') !== -1 ? headers.indexOf('source_id') : 0;

  let rowIndex = -1;
  let existingRow: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r && r[idCol] && String(r[idCol]).trim() === String(sourceId).trim()) {
      rowIndex = i + 1; // 1-based row index in Google Sheets
      existingRow = r;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Object with source_id "${sourceId}" not found in sheet`);
  }

  // 2. Check if any updateData keys are new custom fields not in headers
  let headersModified = false;
  for (const key of Object.keys(updateData)) {
    if (!headers.includes(key)) {
      headers.push(key);
      headersModified = true;
    }
  }

  if (headersModified) {
    const lastHeaderCol = colToA1(headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A1:${lastHeaderCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers]
      }
    });
  }

  // 3. Construct updated row preserving all existing data
  const updatedRow = [...existingRow];
  while (updatedRow.length < headers.length) {
    updatedRow.push('');
  }

  for (const [k, v] of Object.entries(updateData)) {
    // Rule 1: Never change source_id
    if (k === 'source_id') continue;

    const colIdx = headers.indexOf(k);
    if (colIdx !== -1) {
      // Rule 2: Never overwrite source columns (A-V) with empty string
      if (SOURCE_COLUMNS.includes(k)) {
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          updatedRow[colIdx] = String(v).trim();
        }
      } else {
        // Internal B2B and custom columns can be updated or emptied
        updatedRow[colIdx] = v !== null && v !== undefined ? String(v).trim() : '';
      }
    }
  }

  // 4. Update the exact row range with standard A1 notation: 'Varaq1'!A{row}:{lastCol}{row}
  const lastColLetter = colToA1(headers.length - 1);
  const targetRange = `'${tab}'!A${rowIndex}:${lastColLetter}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: targetRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [updatedRow]
    }
  });

  // 5. Instantly update in-memory cache so reads immediately return the updated data
  dataCache.updateRow(sourceId, updateData);

  return { success: true, rowIndex, updated: updateData };
}

/**
 * Append a brand new object to Google Sheet
 */
export async function createObjectInSheet(newRecord: Record<string, any>) {
  const sheets = await getSheetsClient();
  const tab = await getPrimarySheetName(sheets);

  // Get current headers
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!1:1`
  });

  let headers: string[] = res.data.values?.[0] || [];
  if (headers.length === 0) {
    throw new Error('No headers found in sheet');
  }

  // Check if any keys in newRecord are missing from headers
  let headersModified = false;
  for (const key of Object.keys(newRecord)) {
    if (!headers.includes(key)) {
      headers.push(key);
      headersModified = true;
    }
  }

  if (headersModified) {
    const lastHeaderCol = colToA1(headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A1:${lastHeaderCol}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });
  }

  const row = headers.map(h => {
    const val = newRecord[h];
    return val !== null && val !== undefined ? String(val).trim() : '';
  });

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!A1:ZZ`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row]
    }
  });

  // Update in-memory cache immediately
  dataCache.appendRow(newRecord);

  return { success: true, appendRes };
}

/**
 * Get custom field definitions from Settings tab in Google Sheets
 */
export async function getCustomFieldsFromSheet() {
  const sheets = await getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A2:G100'
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      return null;
    }

    return rows.map((r: any) => ({
      field_name: r[0] || '',
      field_type: r[1] || 'text',
      required: String(r[2]).toUpperCase() === 'TRUE',
      visible: String(r[3]).toUpperCase() !== 'FALSE',
      column_letter: r[4] || '',
      label: r[5] || r[0] || '',
      desc: r[6] || ''
    }));
  } catch (e) {
    console.warn('Failed to read Settings tab:', e);
    return null;
  }
}

/**
 * Add a new custom field to both Settings tab and main data sheet (Varaq1)
 */
export async function addCustomFieldToSheet(field: {
  field_name: string;
  field_type?: string;
  label?: string;
  desc?: string;
  required?: boolean;
  visible?: boolean;
}) {
  const sheets = await getSheetsClient();
  const tab = await getPrimarySheetName(sheets);

  // 1. Get current headers in main data sheet
  const headersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!1:1`
  });

  const headers: string[] = headersRes.data.values?.[0] || [];
  let colLetter = '';

  if (headers.includes(field.field_name)) {
    const colIdx = headers.indexOf(field.field_name);
    colLetter = colToA1(colIdx);
  } else {
    // Append header to main data sheet
    headers.push(field.field_name);
    colLetter = colToA1(headers.length - 1);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A1:${colLetter}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });
  }

  // 2. Append to Settings sheet
  const settingsRow = [
    field.field_name,
    field.field_type || 'text',
    field.required ? 'TRUE' : 'FALSE',
    field.visible !== false ? 'TRUE' : 'FALSE',
    colLetter,
    field.label || field.field_name,
    field.desc || ''
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Settings!A1:G',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [settingsRow]
    }
  });

  return {
    success: true,
    field_name: field.field_name,
    column_letter: colLetter
  };
}

/**
 * Append an activity audit record to the ActivityLog tab in Google Sheets
 * Columns: Timestamp | Action | Source_ID | Object_Name | User | Details | Status
 */
export async function logActivity(params: {
  action: 'UPDATE' | 'VISIT' | 'CLEAR' | 'CREATE' | 'ADD_FIELD';
  source_id?: string;
  object_name?: string;
  user?: string;
  details?: Record<string, any> | string;
  status?: 'SUCCESS' | 'FAILED';
}) {
  try {
    const sheets = await getSheetsClient();
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

    let detailsStr = '';
    if (typeof params.details === 'object' && params.details !== null) {
      detailsStr = JSON.stringify(params.details);
    } else {
      detailsStr = String(params.details || '');
    }

    const row = [
      timestamp,
      params.action,
      params.source_id || '',
      params.object_name || '',
      params.user || 'Menejer',
      detailsStr,
      params.status || 'SUCCESS'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'ActivityLog!A1:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });
  } catch (err) {
    console.warn('Failed to record to ActivityLog:', err);
  }
}

