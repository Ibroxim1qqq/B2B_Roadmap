import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1ZmPUfae89OAiK4kJykrL4O3XaSrYUK8KoJlmCjYhzKA';

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
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY;

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

  // Fallback to built-in default service account
  if (!email || !privateKey) {
    email = DEFAULT_SERVICE_ACCOUNT.client_email;
    privateKey = DEFAULT_SERVICE_ACCOUNT.private_key;
  }

  // Fix escaped newlines in private key if passed via single-line env var
  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  const auth = new google.auth.JWT({
    email: email.trim(),
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
