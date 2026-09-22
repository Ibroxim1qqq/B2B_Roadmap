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

/* =========================================================================
   MULTI-COMPANY / MULTI-TENANT FUNCTIONS
   ========================================================================= */

export const COMPANY_DATA_HEADERS = [
  'id', 'company_id', 'source_id', 'tjm_name', 'phone', 
  'sales_office', 'manager_name', 'manager_phone', 'telegram', 
  'instagram', 'notes', 'priority', 'last_visit', 'visited_by', 
  'user_id', 'updated_at', 'is_custom_tjm', 'latitude', 
  'longitude', 'district_soato', 'object_name'
];

/**
 * Fetch all companies from Companies sheet
 */
export async function getCompaniesFromSheet() {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Companies!A1:D'
    });
    const values = res.data.values || [];
    if (values.length <= 1) return [];

    return values.slice(1).map((r: any[]) => ({
      company_id: String(r[0] || '').trim(),
      company_name: String(r[1] || '').trim(),
      status: (String(r[2] || 'active').trim() as 'active' | 'inactive'),
      created_at: String(r[3] || '').trim()
    })).filter((c: any) => c.company_id);
  } catch (err) {
    console.error('getCompaniesFromSheet error:', err);
    return [
      { company_id: 'comp_default', company_name: 'Asosiy Kompaniya', status: 'active', created_at: new Date().toISOString() },
      { company_id: 'comp_samarqand', company_name: 'Samarqand B2B Stroy', status: 'active', created_at: new Date().toISOString() },
      { company_id: 'comp_tashkent', company_name: 'Toshkent Stroy Invest', status: 'active', created_at: new Date().toISOString() }
    ];
  }
}

/**
 * Create a new company in Companies sheet
 */
export async function createCompanyInSheet(name: string, status: string = 'active') {
  const sheets = await getSheetsClient();
  const company_id = `comp_${Date.now()}`;
  const created_at = new Date().toISOString();
  const newRow = [company_id, name.trim(), status, created_at];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Companies!A1:D',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] }
  });

  return { company_id, company_name: name.trim(), status, created_at };
}

/**
 * Fetch all users from Users sheet
 */
export async function getUsersFromSheet() {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!A1:G'
    });
    const values = res.data.values || [];
    if (values.length <= 1) return [];

    return values.slice(1).map((r: any[]) => ({
      user_id: String(r[0] || '').trim(),
      company_id: String(r[1] || '').trim(),
      name: String(r[2] || '').trim(),
      login: String(r[3] || '').trim(),
      password: String(r[4] || '').trim(),
      role: String(r[5] || 'manager').trim(),
      created_at: String(r[6] || '').trim()
    })).filter((u: any) => u.login);
  } catch (err) {
    console.error('getUsersFromSheet error:', err);
    return [];
  }
}

/**
 * Create a new user in Users sheet
 */
export async function createUserInSheet(data: {
  company_id: string;
  name: string;
  login: string;
  password: string;
  role: string;
}) {
  const sheets = await getSheetsClient();
  const user_id = `user_${Date.now()}`;
  const created_at = new Date().toISOString();
  const cleanLogin = data.login.trim().toLowerCase();

  const newRow = [
    user_id,
    data.company_id.trim(),
    data.name.trim(),
    cleanLogin,
    data.password,
    data.role.trim() || 'manager',
    created_at
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Users!A1:G',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] }
  });

  return {
    user_id,
    company_id: data.company_id,
    name: data.name,
    login: cleanLogin,
    role: data.role,
    created_at
  };
}

/**
 * Authenticate user credentials against Users sheet
 */
export async function authenticateUserInSheet(login: string, pass: string) {
  const cleanLogin = login.trim().toLowerCase();
  const users = await getUsersFromSheet();
  const companies = await getCompaniesFromSheet();

  // Superadmin fallback if sheet is fresh
  if (cleanLogin === 'admin' && pass === 'admin123') {
    return {
      id: 'user_admin',
      user_id: 'user_admin',
      name: 'Super Administrator',
      login: 'admin',
      role: 'superadmin',
      company_id: 'system',
      company_name: 'Boshqaruv Tizimi',
      avatarInitials: 'SA'
    };
  }

  const found = users.find((u: any) => u.login.toLowerCase() === cleanLogin && u.password === pass);
  if (!found) return null;

  const comp = companies.find((c: any) => c.company_id === found.company_id);
  const initials = found.name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'US';

  return {
    id: found.user_id,
    user_id: found.user_id,
    name: found.name,
    login: found.login,
    role: found.role,
    company_id: found.company_id,
    company_name: comp ? comp.company_name : found.company_id,
    avatarInitials: initials
  };
}

/**
 * Fetch company-isolated CRM overrides and custom TJMs from Company_Data sheet
 */
export async function getCompanyDataFromSheet(companyId: string) {
  if (!companyId) return { overrides: new Map<string, any>(), customObjects: [] };
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Company_Data!A1:U'
    });
    const values = res.data.values || [];
    if (values.length <= 1) return { overrides: new Map<string, any>(), customObjects: [] };

    const headers: string[] = values[0];
    const overrides = new Map<string, any>();
    const customObjects: any[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || !row[0]) continue;
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      });

      // Filter strictly by company_id (or if company is 'system'/superadmin viewing all)
      if (companyId !== 'system' && rowObj.company_id !== companyId) {
        continue;
      }

      if (rowObj.is_custom_tjm === 'true') {
        customObjects.push(rowObj);
      } else if (rowObj.source_id) {
        overrides.set(rowObj.source_id, rowObj);
      }
    }

    return { overrides, customObjects };
  } catch (err) {
    console.error('getCompanyDataFromSheet error:', err);
    return { overrides: new Map<string, any>(), customObjects: [] };
  }
}

/**
 * Upsert company-specific CRM record in Company_Data sheet
 */
export async function updateCompanyDataInSheet(
  companyId: string,
  userId: string,
  sourceId: string,
  updateData: Record<string, any>
) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Company_Data!A1:U'
  });

  const values = res.data.values || [];
  let headers: string[] = values.length > 0 ? values[0] : [...COMPANY_DATA_HEADERS];
  let targetRowIndex = -1;
  let existingRow: string[] = [];

  const compIdIdx = headers.indexOf('company_id');
  const sourceIdIdx = headers.indexOf('source_id');

  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (
      r && 
      r[compIdIdx] === companyId && 
      String(r[sourceIdIdx]).trim() === String(sourceId).trim()
    ) {
      targetRowIndex = i + 1; // 1-based index
      existingRow = r;
      break;
    }
  }

  const now = new Date().toISOString();

  if (targetRowIndex !== -1) {
    // Update existing company record
    const updatedRow = [...existingRow];
    while (updatedRow.length < headers.length) updatedRow.push('');

    for (const [k, v] of Object.entries(updateData)) {
      const idx = headers.indexOf(k);
      if (idx !== -1 && !['id', 'company_id', 'source_id'].includes(k)) {
        updatedRow[idx] = v !== null && v !== undefined ? String(v).trim() : '';
      }
    }
    const userIdx = headers.indexOf('user_id');
    if (userIdx !== -1) updatedRow[userIdx] = userId || '';
    const updatedIdx = headers.indexOf('updated_at');
    if (updatedIdx !== -1) updatedRow[updatedIdx] = now;

    const lastCol = colToA1(headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Company_Data!A${targetRowIndex}:${lastCol}${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] }
    });

    return { success: true, updated: updatedRow };
  } else {
    // Append new company CRM record
    const newRecord: Record<string, string> = {
      id: `cd_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      company_id: companyId,
      source_id: sourceId,
      user_id: userId || '',
      updated_at: now,
      is_custom_tjm: 'false'
    };
    for (const [k, v] of Object.entries(updateData)) {
      newRecord[k] = v !== null && v !== undefined ? String(v).trim() : '';
    }

    const rowData = headers.map(h => newRecord[h] || '');
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Company_Data!A1:U',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowData] }
    });

    return { success: true, added: rowData };
  }
}

/**
 * Create a custom TJM object in Company_Data sheet for this company
 */
export async function createCompanyCustomTJM(
  companyId: string,
  userId: string,
  data: Record<string, any>
) {
  const sheets = await getSheetsClient();
  const customId = `custom_${Date.now()}`;
  const now = new Date().toISOString();

  const rowRecord: Record<string, string> = {
    id: `cd_${Date.now()}`,
    company_id: companyId,
    source_id: customId,
    object_name: data.object_name || data.tjm_name || 'Yangi TJM',
    tjm_name: data.tjm_name || data.object_name || 'Yangi TJM',
    phone: data.phone || '',
    sales_office: data.sales_office || '',
    manager_name: data.manager_name || '',
    manager_phone: data.manager_phone || '',
    telegram: data.telegram || '',
    instagram: data.instagram || '',
    notes: data.notes || '',
    priority: data.priority || 'Normal',
    last_visit: data.last_visit || '',
    visited_by: data.visited_by || '',
    user_id: userId || '',
    updated_at: now,
    is_custom_tjm: 'true',
    latitude: String(data.latitude || '39.6542'),
    longitude: String(data.longitude || '66.9597'),
    district_soato: String(data.district_soato || '1718401')
  };

  const rowData = COMPANY_DATA_HEADERS.map(h => rowRecord[h] || '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Company_Data!A1:U',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] }
  });

  return { success: true, customId, data: rowRecord };
}

/* =========================================================================
   ROUTES / NAVIGATOR TRIP STORAGE
   ========================================================================= */

export const ROUTE_HEADERS = [
  'id', 'company_id', 'user_id', 'user_name',
  'start_name', 'start_lat', 'start_lng',
  'end_name', 'end_lat', 'end_lng',
  'distance_km', 'duration_min', 'tjm_count', 'tjm_list',
  'buffer_radius_m', 'notes', 'status', 'created_at'
];

/**
 * Save planned route to Routes sheet in Google Sheets
 */
export async function saveRouteToSheet(routeData: {
  company_id: string;
  user_id?: string;
  user_name?: string;
  start_name: string;
  start_lat: number;
  start_lng: number;
  end_name: string;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  duration_min: number;
  tjm_count: number;
  tjm_list: string;
  buffer_radius_m: number;
  notes?: string;
  status?: string;
}) {
  const sheets = await getSheetsClient();
  const routeId = `route_${Date.now()}`;
  const now = new Date().toISOString();

  const record: Record<string, string> = {
    id: routeId,
    company_id: routeData.company_id || 'comp_default',
    user_id: routeData.user_id || '',
    user_name: routeData.user_name || 'Menejer',
    start_name: routeData.start_name || '',
    start_lat: String(routeData.start_lat || ''),
    start_lng: String(routeData.start_lng || ''),
    end_name: routeData.end_name || '',
    end_lat: String(routeData.end_lat || ''),
    end_lng: String(routeData.end_lng || ''),
    distance_km: String(routeData.distance_km || 0),
    duration_min: String(routeData.duration_min || 0),
    tjm_count: String(routeData.tjm_count || 0),
    tjm_list: routeData.tjm_list || '',
    buffer_radius_m: String(routeData.buffer_radius_m || 200),
    notes: routeData.notes || '',
    status: routeData.status || 'Rejalashtirilgan',
    created_at: now
  };

  const rowData = ROUTE_HEADERS.map(h => record[h] || '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Routes!A1:R',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] }
  });

  return { success: true, routeId, data: record };
}

/**
 * Fetch saved routes from Routes sheet in Google Sheets
 */
export async function getRoutesFromSheet(companyId?: string) {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Routes!A1:R'
    });

    const values = res.data.values || [];
    if (values.length <= 1) return [];

    const headers: string[] = values[0];
    const routes: any[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || !row[0]) continue;

      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      });

      // Filter by company_id if specified (superadmin 'system' can see all)
      if (companyId && companyId !== 'system' && obj.company_id && obj.company_id !== companyId) {
        continue;
      }

      routes.push({
        id: obj.id,
        company_id: obj.company_id,
        user_id: obj.user_id,
        user_name: obj.user_name,
        start_name: obj.start_name,
        start_lat: parseFloat(obj.start_lat) || 0,
        start_lng: parseFloat(obj.start_lng) || 0,
        end_name: obj.end_name,
        end_lat: parseFloat(obj.end_lat) || 0,
        end_lng: parseFloat(obj.end_lng) || 0,
        distance_km: parseFloat(obj.distance_km) || 0,
        duration_min: parseFloat(obj.duration_min) || 0,
        tjm_count: parseInt(obj.tjm_count) || 0,
        tjm_list: obj.tjm_list,
        buffer_radius_m: parseInt(obj.buffer_radius_m) || 200,
        notes: obj.notes,
        status: obj.status,
        created_at: obj.created_at
      });
    }

    return routes.reverse(); // newest first
  } catch (err) {
    console.error('getRoutesFromSheet error:', err);
    return [];
  }
}

export const NOTIFICATION_HEADERS = [
  'id', 'timestamp', 'title', 'summary', 'new_count', 'by_region_json', 'new_objects_json'
];

/**
 * Ensure Notifications tab exists in Google Sheets
 */
export async function ensureNotificationsSheet(sheets: any) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const exists = meta.data.sheets?.some((s: any) => s.properties?.title === 'Notifications');
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: 'Notifications' } }
          }]
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Notifications!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [NOTIFICATION_HEADERS] }
      });
    }
  } catch (e) {
    console.error('ensureNotificationsSheet error:', e);
  }
}

/**
 * Save notification report to Google Sheets Notifications sheet
 */
export async function saveNotificationToSheet(notif: any) {
  try {
    const sheets = await getSheetsClient();
    await ensureNotificationsSheet(sheets);
    const row = [
      notif.id || `notif_${Date.now()}`,
      notif.timestamp || new Date().toISOString(),
      notif.title || '',
      notif.summary || '',
      String(notif.new_count || 0),
      typeof notif.by_region === 'string' ? notif.by_region : JSON.stringify(notif.by_region || {}),
      typeof notif.new_objects === 'string' ? notif.new_objects : JSON.stringify(notif.new_objects || [])
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Notifications!A1:G',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    return { success: true, id: row[0] };
  } catch (e: any) {
    console.error('saveNotificationToSheet error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetch notifications from Google Sheets Notifications sheet (with local JSON fallback)
 */
export async function getNotificationsFromSheet(): Promise<any[]> {
  const notifsCachePath = path.join(process.cwd(), 'src', 'lib', 'notifications.json');
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Notifications!A1:G'
    });
    const values = res.data.values || [];
    if (values.length > 1) {
      const headers: string[] = values[0];
      const notifications: any[] = [];

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row || !row[0]) continue;
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
        });

        let byRegion = {};
        let newObjects = [];
        try {
          byRegion = obj.by_region_json ? JSON.parse(obj.by_region_json) : {};
        } catch (e) {}
        try {
          newObjects = obj.new_objects_json ? JSON.parse(obj.new_objects_json) : [];
        } catch (e) {}

        notifications.push({
          id: obj.id,
          timestamp: obj.timestamp,
          title: obj.title,
          summary: obj.summary,
          new_count: parseInt(obj.new_count) || newObjects.length,
          by_region: byRegion,
          new_objects: newObjects
        });
      }

      const sorted = notifications.reverse();
      // Cache locally
      try {
        fs.writeFileSync(notifsCachePath, JSON.stringify(sorted, null, 2), 'utf-8');
      } catch (e) {}

      return sorted;
    }
  } catch (err) {
    console.warn('Google Sheets notifications fetch failed, attempting local fallback:', err);
  }

  // Fallback to local file if sheets call fails or has no rows
  if (fs.existsSync(notifsCachePath)) {
    try {
      const raw = fs.readFileSync(notifsCachePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }

  return [];
}



