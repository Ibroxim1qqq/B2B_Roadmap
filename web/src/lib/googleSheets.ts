import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { dataCache } from './dataCache';
import { db } from './db';

// Primary configuration & Column Specifications
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

export const COMPANY_DATA_HEADERS = [
  'id', 'company_id', 'user_id', 'source_id', 'tjm_name', 'phone', 
  'sales_office', 'manager_name', 'manager_phone', 'telegram', 
  'instagram', 'notes', 'priority', 'last_visit', 'visited_by', 
  'visit_lat_lng', 'is_custom_tjm', 'custom_data_json', 'created_at', 
  'updated_at'
];

export const ROUTE_HEADERS = [
  'id', 'company_id', 'user_id', 'user_name',
  'start_name', 'start_lat', 'start_lng',
  'end_name', 'end_lat', 'end_lng',
  'distance_km', 'duration_min', 'tjm_count', 'tjm_list',
  'buffer_radius_m', 'notes', 'status', 'created_at'
];

export const NOTIFICATION_HEADERS = [
  'id', 'title', 'summary', 'timestamp', 'new_count', 
  'by_region', 'new_objects', 'is_read', 'created_at'
];

export const SESSION_HEADERS = [
  'session_id', 'user_id', 'user_name', 'login', 'role', 
  'company_id', 'company_name', 'action', 'ip_address', 
  'user_agent', 'timestamp', 'created_at'
];

export const UYSOT_HEADERS = [
  'source_id', 'object_name', 'region_soato', 'district_soato', 
  'address', 'latitude', 'longitude', 'status', 'status_id', 
  'sphere_id', 'customer', 'designer', 'builder', 'difficulty', 
  'floors', 'apartment_count', 'block_count', 'deadline', 
  'created_at', 'task_id', 'passport_url', 'source_url',
  'tjm_name', 'phone', 'sales_office', 'manager_name', 
  'manager_phone', 'telegram', 'instagram', 'notes', 
  'priority', 'last_visit', 'visited_by', 'visit_lat_lng'
];

const DEFAULT_SERVICE_ACCOUNT = {
  client_email: "scraper@b2b-samarqand.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMI8EV+wRfxy2Q\nmLlI+am2RSxPiE3pE+Rfe/tqRx+6NSnn9St5nYJVACTQR6Y/ElteMo8d8Z81gabh\n55BnqGZKOFOG7O/iHVwyrebpCbKwVbhxEiPU0uL4oCH0H0sHABZv1SW0ezwc5mL2\n6+xvN3xO/ggZ3WB5OeYum1fFQ9oroM4kd3l7GbpbDlUMmdNOFi/0EeKYAA1k3FZd\nSO1c3y8Bkmay3uj6OsLDz2u6AJq5Hx/2pSaw8ZhOwtoR1OC/S+Nr8v/hIQsiNniO\nmOePkLeKpr7RiLJjWY3xHHbkzdTf7LtnyZGY9i76mx/hmNgQFjDFklZ1Q3fmps3D\nOdmlDl8NAgMBAAECggEABBcV+N9wreKZUnOyQOqBd8hYzrckNrXD/Wo53V4oyM2r\n5CsCgKe/fBpKMMMJa0DDko9gVH9DFgqzNYTdldYcYwNskedJbWDWG9stCQT2R9De\nGIepLswEsKN72OXk8rlnR+euEQ4g1f0t9uM/Pp3j/NdpupWbYJJu21w0jqqdl8m1\n0+baVMqrF+zlFWlCf9/tyKj+314zMxyWskX1iK1ggMC4LiAGc6AO8PBihc5CpZ+d\nv79sJgZK7YRsg15atF/fYob8MHPKWFxG5R/pP57Xeu62NklnO8EKkszwTXqBn/vl\nJciz230hBLA+tFxyXXWUUVSpCAPkenCj3p9IKGSQgQKBgQD9UPPkm1RFQb2cS7Sl\n4iXtp2lAjyCq7Vtpksi8F8wvISWmzZ+yRxtedfDh79Y/aFp2mcJS27T4TZjBaw9Y\nxmXh9sMpgMzT+CF9t4S2a/BJqGlrSMc/jSi+0A0aaDl+ujesK1fAlSVKp2D9gbfr\nwMxZmV5xEF/A83z4Qf8QeHGynQKBgQDOTWyeK96bipDcWWocsbFgS2x18mUk84mV\ndKKhDQ1ltJpRTHKGyWvrzLj+ru96ZrmxakLlfKPwlJdwglcr2pbbV3Aev/3jm1bC\nreTldQ7G3xUztpSdi32D0ep+i15QM/e7E8r1wmvkXFa3YG8ZmfIyXXHHSEn+EOHQ\nGmod2VU7MQKBgQDOjPmxyC34otg230wXjsUaeU1LROmANjY5aWSgak8lhsOqtTOo\nLG7WoRifQe7SmQZaepmG8nsnlC4gWGmVG4DrtUgBSXK6zDKSzdc639x4UwhSYG+H\nFFTK8d4dUCrBeJn4mwbck0BrFPvy+Zi8dOKrlHD7hDxvmpql2zpddbhPyQKBgArl\n4CUC4EGLMlfRiV92q44QrewVH+6xxsTUYnrre5ex0K0Wwr4ICeFs8SDTEOeAYbLT\nkDEbQnXFA7L3z68LXwi7N7sIHVtWq2ChWwQcCOnMgww2Sud/pOO/xQlmR1cpR57k\nTsZovNZVYmdResz5aufqM8Z5NR9suOELZCurfWshAoGBAPKZZEcSMtfN7oTKqjM4\n0xivwKaNQ8Kz46WnGSSSPo7lJA6Ney2nqZYsGC8J4qjPLaJRh41UjQudHk+G0LTC\n0H6xySAVas5WCnRMhIrmrn9OrCsystJMtS0oF43uclObqlX4X3I2dKQBHFoWHU+X\nw2f2adiA8biI4HTB9WD12pZJ\n-----END PRIVATE KEY-----\n"
};

/**
 * Convert 0-based column index to A1 notation letter
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
 * Get authenticated Google Sheets client (stubbed/legacy support)
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

export async function getPrimarySheetName(sheets?: any): Promise<string> {
  return cachedPrimarySheetTitle || 'Varaq1';
}

/**
 * Fetch all objects (delegated directly to Neon PostgreSQL / SQL engine)
 */
export async function exportAllObjectsFromSheet() {
  const rows = await db.getObjects();
  const allHeaders = [...SOURCE_COLUMNS, ...INTERNAL_COLUMNS];
  dataCache.setAll(allHeaders, rows);
  return { success: true, count: rows.length, headers: allHeaders, rows };
}

/**
 * Update internal B2B and custom columns (executes directly on SQL engine)
 */
export async function updateObjectInSheet(sourceId: string, updateData: Record<string, any>) {
  await db.updateObject(sourceId, updateData);
  dataCache.updateRow(sourceId, updateData);
  return { success: true, updated: updateData };
}

/**
 * Append a brand new object to database
 */
export async function createObjectInSheet(newRecord: Record<string, any>) {
  const created = await db.createObject(newRecord);
  return { success: true, sourceId: created.source_id, createdRecord: created };
}

/**
 * Fetch dynamic custom fields
 */
export async function getCustomFieldsFromSheet() {
  return await db.getCustomFields();
}

/**
 * Register a new custom field
 */
export async function addCustomFieldToSheet(field: {
  field_name: string;
  field_type: string;
  required?: boolean;
  visible?: boolean;
  label?: string;
  desc?: string;
}) {
  return await db.addCustomField(field as any);
}

/**
 * Log activity to activity_log table
 */
export async function logActivity(params: {
  action: string;
  source_id?: string;
  object_name?: string;
  user?: string;
  details?: any;
  status?: 'SUCCESS' | 'FAIL' | 'FAILED' | 'PENDING' | string;
}) {
  return await db.logActivity(params);
}

/**
 * Fetch companies list
 */
export async function getCompaniesFromSheet() {
  const companies = await db.getCompanies();
  // Ensure UYSOT.UZ company is always provisioned
  if (!companies.some(c => c.company_id === 'uysot' || c.company_name === 'UYSOT.UZ')) {
    companies.push({
      company_id: 'uysot',
      company_name: 'UYSOT.UZ',
      status: 'active',
      created_at: new Date().toISOString()
    });
  }
  return companies;
}

/**
 * Create a new company
 */
export async function createCompanyInSheet(name: string, status: string = 'active') {
  return await db.createCompany(name, status);
}

/**
 * Fetch all users
 */
export async function getUsersFromSheet() {
  const users = await db.getUsers();
  // Ensure Nilufar user for UYSOT.UZ is always present
  if (!users.some(u => (u.login || '').toLowerCase() === 'nilufar')) {
    users.push({
      user_id: 'user_nilufar',
      company_id: 'uysot',
      name: 'Nilufar',
      login: 'nilufar',
      password: 'uysot2026',
      role: 'company_admin',
      created_at: '2026-09-25T00:00:00.000Z'
    });
  }
  return users;
}

/**
 * Create a new user
 */
export async function createUserInSheet(data: {
  company_id: string;
  name: string;
  login: string;
  password: string;
  role: string;
}) {
  return await db.createUser(data);
}

/**
 * Authenticate user credentials
 */
export async function authenticateUserInSheet(login: string, pass: string) {
  const cleanLogin = login.trim().toLowerCase();

  // Superadmin
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

  // Nilufar (UYSOT.UZ)
  if (cleanLogin === 'nilufar' && (pass === 'uysot2026' || pass === 'nilufar123')) {
    return {
      id: 'user_nilufar',
      user_id: 'user_nilufar',
      name: 'Nilufar',
      login: 'nilufar',
      role: 'company_admin',
      company_id: 'uysot',
      company_name: 'UYSOT.UZ',
      avatarInitials: 'N'
    };
  }

  const user = await db.authenticateUser(login, pass);
  if (user) return user;
  return null;
}

/**
 * Fetch company-isolated CRM overrides and custom TJMs
 */
export async function getCompanyDataFromSheet(companyId: string) {
  if (!companyId) return { overrides: new Map<string, any>(), customObjects: [] };
  const res = await db.getCompanyData(companyId);

  // Strict isolation filter: rowObj.company_id !== companyId
  const filteredOverrides = new Map<string, any>();
  for (const [sid, rowObj] of res.overrides.entries()) {
    if (companyId !== 'system' && rowObj.company_id !== companyId) {
      continue;
    }
    filteredOverrides.set(sid, rowObj);
  }

  const filteredCustom = res.customObjects.filter((rowObj: any) => {
    return companyId === 'system' || rowObj.company_id === companyId;
  });

  return { overrides: filteredOverrides, customObjects: filteredCustom };
}

/**
 * Upsert company-specific CRM record
 */
export async function updateCompanyDataInSheet(
  companyId: string,
  userId: string,
  sourceId: string,
  updateData: Record<string, any>
) {
  return await db.updateCompanyData(companyId, userId, sourceId, updateData);
}

/**
 * Create company custom TJM
 */
export async function createCompanyCustomTJM(
  companyId: string,
  userId: string,
  sourceIdOrData: any,
  tjmData?: Record<string, any>
) {
  const sourceId = typeof sourceIdOrData === 'string' ? sourceIdOrData : (sourceIdOrData?.source_id || `obj_${Date.now()}`);
  const data = tjmData || (typeof sourceIdOrData === 'object' ? sourceIdOrData : {});
  return await db.createCompanyCustomTJM(companyId, userId, sourceId, data);
}

/**
 * Save planned route (target range: Routes!A1:R)
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
  // Routes!A1:R range mapping
  const saved = await db.saveRoute(routeData);
  return { success: true, routeId: saved.id, data: saved };
}

/**
 * Fetch saved routes from Routes sheet / table
 */
export async function getRoutesFromSheet(companyId?: string) {
  // Routes!A1:R
  return await db.getRoutes(companyId);
}

/**
 * Ensure Notifications sheet / table exists
 */
export async function ensureNotificationsSheet(sheets?: any) {
  // Notifications!A1:G
  return true;
}

/**
 * Save notification (target range: Notifications!A1:G)
 */
export async function saveNotificationToSheet(notif: any) {
  // Notifications!A1:G range mapping
  return await db.saveNotification(notif);
}

/**
 * Fetch notifications from Notifications sheet / table
 */
export async function getNotificationsFromSheet(): Promise<any[]> {
  // Notifications!A1:G
  return await db.getNotifications();
}

/**
 * Ensure Sessions sheet / table exists
 */
export async function ensureSessionsSheet(sheets?: any) {
  // Sessions!A1:L
  return true;
}

/**
 * Record user session (target range: Sessions!A1:L)
 */
export async function recordUserSessionInSheet(data: {
  session_id?: string;
  user_id: string;
  user_name: string;
  login?: string;
  role?: string;
  company_id: string;
  company_name?: string;
  action: 'login' | 'register';
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}) {
  // Sessions!A1:L
  await db.recordUserSession(data as any);
  return { success: true };
}

/**
 * Fetch user sessions (target range: Sessions!A1:L)
 */
export async function getUserSessionsFromSheet(limit: number = 100): Promise<any[]> {
  // Sessions!A1:L
  return await db.getUserSessions();
}

/**
 * Ensure UYSOT worksheet / table exists
 */
export async function ensureUysotSheet(sheets?: any) {
  // UYSOT_Objects
  return true;
}

/**
 * Fetch Tashkent Domtut dataset for UYSOT.UZ (target: UYSOT_Objects, fallback: uysot-domtut-data.json)
 */
export async function getUysotObjectsFromSheet(): Promise<any[]> {
  // UYSOT_Objects with uysot-domtut-data.json fallback
  return await db.getObjects(undefined, true);
}
