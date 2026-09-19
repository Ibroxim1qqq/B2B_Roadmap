import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ZmPUfae89OAiK4kJykrL4O3XaSrYUK8KoJlmCjYhzKA';

export const INTERNAL_COLUMNS = [
  'tjm_name', 'phone', 'sales_office', 'manager_name', 
  'manager_phone', 'telegram', 'instagram', 'notes', 
  'priority', 'last_visit', 'visited_by', 'visit_lat_lng'
];

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Check if full JSON is provided in env
  if (!email && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      email = parsed.client_email;
      privateKey = parsed.private_key;
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  // Fallback to local credentials.json in development if available
  if (!email || !privateKey) {
    const credPath = path.join(process.cwd(), 'credentials.json');
    const scraperCredPath = path.join(process.cwd(), '..', 'scraper', 'credentials.json');
    const targetPath = fs.existsSync(credPath) ? credPath : (fs.existsSync(scraperCredPath) ? scraperCredPath : null);
    if (targetPath) {
      try {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        const parsed = JSON.parse(raw);
        email = parsed.client_email;
        privateKey = parsed.private_key;
      } catch (e) {}
    }
  }

  if (!email || !privateKey) {
    throw new Error('Google Sheets Service Account credentials not configured');
  }

  // Fix escaped newlines in private key if passed via single-line env var
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Update internal B2B columns for an object in Google Sheet
 */
export async function updateObjectInSheet(sourceId: string, updateData: Record<string, any>) {
  const sheets = await getSheetsClient();
  
  // 1. Fetch existing headers and IDs
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:AH'
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) {
    throw new Error('Google Sheet is empty');
  }

  const headers = rows[0];
  const idCol = headers.indexOf('source_id') !== -1 ? headers.indexOf('source_id') : 0;

  let rowIndex = -1;
  let existingRow: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r && r[idCol] && String(r[idCol]).trim() === String(sourceId).trim()) {
      rowIndex = i + 1; // 1-based index
      existingRow = r;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Object with source_id "${sourceId}" not found in sheet`);
  }

  // Column W is col 23 (index 22 in 0-based index)
  const wIndex = 22;
  const currentInternal = existingRow.slice(wIndex, wIndex + INTERNAL_COLUMNS.length);
  while (currentInternal.length < INTERNAL_COLUMNS.length) {
    currentInternal.push('');
  }

  const currentDict: Record<string, string> = {};
  INTERNAL_COLUMNS.forEach((col, idx) => {
    currentDict[col] = currentInternal[idx] || '';
  });

  // Apply updates
  for (const [k, v] of Object.entries(updateData)) {
    if (INTERNAL_COLUMNS.includes(k)) {
      currentDict[k] = v !== null && v !== undefined ? String(v) : '';
    }
  }

  const updatedValues = INTERNAL_COLUMNS.map(k => currentDict[k] || '');

  // Update range W{row}:AH{row}
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `W${rowIndex}:AH${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedValues]
    }
  });

  return { success: true, rowIndex, updated: updateData };
}

/**
 * Append a new object to Google Sheet
 */
export async function createObjectInSheet(newRecord: Record<string, any>) {
  const sheets = await getSheetsClient();

  // Get headers
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: '1:1'
  });

  const headers = res.data.values?.[0] || [];
  if (headers.length === 0) {
    throw new Error('No headers found in sheet');
  }

  const row = headers.map(h => {
    const val = newRecord[h];
    return val !== null && val !== undefined ? String(val) : '';
  });

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'A:AH',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row]
    }
  });

  return { success: true, appendRes };
}

/**
 * Fetch all objects from sheet and refresh local cache
 */
export async function exportAllObjectsFromSheet() {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:AH'
  });

  const values = res.data.values || [];
  if (values.length <= 1) {
    return { success: false, count: 0, rows: [] };
  }

  const headers = values[0];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = r[idx] || '';
    });
    rows.push(rowObj);
  }

  return { success: true, count: rows.length, headers, rows };
}
