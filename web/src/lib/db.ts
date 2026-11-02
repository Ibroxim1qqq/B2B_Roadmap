import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'node:crypto';
import type {
  Company, UserProfile, SavedRoute,
  WeeklySyncNotification, UserSession, CustomField
} from './types.ts';
import { hashPassword, isHashedPassword, verifyPassword } from './password.ts';
import type { DataSource } from './company.ts';

export class DatabaseUnavailableError extends Error {}
export class DuplicateLoginError extends Error {}

// 1. Connection string resolution. There is deliberately no built-in value.
export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();
}

export function isPostgresConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(url && (url.startsWith('postgres://') || url.startsWith('postgresql://')));
}

export function getSql() {
  return isPostgresConfigured() ? neon(getDatabaseUrl()) : null;
}

// 2. Neon Database Schema Definition (PostgreSQL)
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    data_source VARCHAR(50) DEFAULT 'dshk',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'manager',
    company_id VARCHAR(100) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    avatar_initials VARCHAR(10) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(100) UNIQUE NOT NULL,
    object_name TEXT NOT NULL,
    region_soato VARCHAR(20) DEFAULT '1718',
    region_name VARCHAR(100) DEFAULT '',
    district_soato VARCHAR(20) DEFAULT '',
    district_name VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    status VARCHAR(100) DEFAULT 'Qurilish jarayonida',
    status_id INT DEFAULT 1,
    sphere_id VARCHAR(50) DEFAULT '57',
    sphere_name VARCHAR(100) DEFAULT 'Ko''p xonadonli uy-joylar',
    customer TEXT DEFAULT '—',
    designer TEXT DEFAULT '—',
    builder TEXT DEFAULT '—',
    difficulty VARCHAR(50) DEFAULT 'II-toifa',
    floors VARCHAR(50) DEFAULT '—',
    apartment_count VARCHAR(50) DEFAULT '0',
    block_count VARCHAR(50) DEFAULT '1',
    deadline VARCHAR(100) DEFAULT '—',
    created_at VARCHAR(100) DEFAULT '',
    task_id VARCHAR(100) DEFAULT '',
    passport_url TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_uysot BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_data (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) DEFAULT '',
    source_id VARCHAR(100) NOT NULL,
    tjm_name VARCHAR(255) DEFAULT '',
    phone VARCHAR(100) DEFAULT '',
    sales_office TEXT DEFAULT '',
    manager_name VARCHAR(255) DEFAULT '',
    manager_phone VARCHAR(100) DEFAULT '',
    telegram VARCHAR(100) DEFAULT '',
    instagram VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT '',
    priority VARCHAR(50) DEFAULT 'Normal',
    last_visit VARCHAR(100) DEFAULT '',
    visited_by VARCHAR(255) DEFAULT '',
    visit_lat_lng VARCHAR(100) DEFAULT '',
    is_custom_tjm BOOLEAN DEFAULT FALSE,
    custom_object_json JSONB DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_company_source UNIQUE (company_id, source_id)
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(100) UNIQUE NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) DEFAULT '',
    user_name VARCHAR(255) DEFAULT '',
    route_name VARCHAR(255) NOT NULL,
    start_name VARCHAR(255) NOT NULL,
    start_lat NUMERIC(10, 6) NOT NULL,
    start_lng NUMERIC(10, 6) NOT NULL,
    end_name VARCHAR(255) NOT NULL,
    end_lat NUMERIC(10, 6) NOT NULL,
    end_lng NUMERIC(10, 6) NOT NULL,
    distance_km NUMERIC(10, 2) DEFAULT 0,
    duration_min NUMERIC(10, 2) DEFAULT 0,
    tjm_count INT DEFAULT 0,
    tjm_list TEXT DEFAULT '',
    buffer_radius_m INT DEFAULT 200,
    notes TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notif_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT DEFAULT '',
    sync_date VARCHAR(50) NOT NULL,
    new_count INT DEFAULT 0,
    by_region_json JSONB DEFAULT '{}',
    new_objects_json JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    login VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100) DEFAULT '',
    user_agent TEXT DEFAULT '',
    timestamp VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_fields (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(100) UNIQUE NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    column_letter VARCHAR(10) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) DEFAULT '',
    object_name VARCHAR(255) DEFAULT '',
    user_info VARCHAR(255) DEFAULT '',
    details TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objects_source_id ON objects(source_id);
CREATE INDEX IF NOT EXISTS idx_objects_region ON objects(region_soato);
CREATE INDEX IF NOT EXISTS idx_objects_is_uysot ON objects(is_uysot);
CREATE INDEX IF NOT EXISTS idx_company_data_cid_sid ON company_data(company_id, source_id);
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
`;

// Additive only: nothing here may drop or rewrite existing rows. Bump SCHEMA_VERSION when adding statements.
const SCHEMA_VERSION = 3;
export const MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS object_visits (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) DEFAULT '',
    visited_by TEXT DEFAULT '',
    lat_lng VARCHAR(100) DEFAULT '',
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_object_visits_lookup ON object_visits(company_id, source_id, visited_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE company_data ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS label TEXT DEFAULT '';
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE custom_fields DROP CONSTRAINT IF EXISTS custom_fields_field_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_fields_company ON custom_fields(company_id, field_name);

ALTER TABLE company_data ALTER COLUMN tjm_name TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN phone TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN manager_name TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN manager_phone TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN telegram TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN instagram TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN priority TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN last_visit TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN visited_by TYPE TEXT;
ALTER TABLE company_data ALTER COLUMN visit_lat_lng TYPE TEXT;
ALTER TABLE routes ALTER COLUMN user_name TYPE TEXT;
ALTER TABLE routes ALTER COLUMN route_name TYPE TEXT;
ALTER TABLE routes ALTER COLUMN start_name TYPE TEXT;
ALTER TABLE routes ALTER COLUMN end_name TYPE TEXT;
ALTER TABLE activity_log ALTER COLUMN object_name TYPE TEXT;
ALTER TABLE activity_log ALTER COLUMN user_info TYPE TEXT;
ALTER TABLE user_sessions ALTER COLUMN user_name TYPE TEXT;
ALTER TABLE user_sessions ALTER COLUMN company_name TYPE TEXT;
ALTER TABLE objects ALTER COLUMN district_name TYPE TEXT;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS sales_office TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS manager_name TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS manager_phone TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS telegram TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS price_from TEXT DEFAULT '';
ALTER TABLE objects ADD COLUMN IF NOT EXISTS class_building TEXT DEFAULT '';

UPDATE companies SET data_source = 'uysot'
  WHERE data_source IS DISTINCT FROM 'uysot'
    AND (company_id = 'uysot' OR LOWER(company_name) LIKE '%uysot%')
`;

// 3. In-memory store for local development and the automated tests. Never used in production.
interface LocalStore {
  companies: Company[];
  users: any[];
  objects: any[];
  companyData: Map<string, any>;
  routes: SavedRoute[];
  notifications: WeeklySyncNotification[];
  sessions: UserSession[];
  customFields: CustomField[];
  activityLogs: any[];
  initialized: boolean;
}

const localStore: LocalStore = {
  companies: [
    { company_id: 'comp_default', company_name: 'Asosiy Kompaniya', status: 'active', created_at: new Date().toISOString() },
    { company_id: 'comp_samarqand', company_name: 'Samarqand B2B Stroy', status: 'active', created_at: new Date().toISOString() },
    { company_id: 'uysot', company_name: 'UYSOT.UZ', status: 'active', created_at: new Date().toISOString() }
  ],
  users: [
    {
      id: 'user_admin',
      user_id: 'user_admin',
      name: 'Super Administrator',
      role: 'superadmin',
      company_id: 'system',
      company_name: 'Tizim Boshqaruvi',
      login: 'admin',
      password_hash: 'admin123',
      phone: '+998 90 000 00 01',
      avatar_initials: 'SA'
    },
    {
      id: 'user_ibroxim',
      user_id: 'user_ibroxim',
      name: 'Ibroxim Toirov',
      role: 'company_admin',
      company_id: 'comp_default',
      company_name: 'Asosiy Kompaniya',
      login: 'ibroxim',
      password_hash: 'ibroxim2026',
      phone: '+998 90 123 45 67',
      avatar_initials: 'IT'
    },
    {
      id: 'user_mgr1',
      user_id: 'user_mgr1',
      name: 'Alisher Karimov',
      role: 'manager',
      company_id: 'comp_default',
      company_name: 'Asosiy Kompaniya',
      login: 'menejer1',
      password_hash: '123456',
      phone: '+998 91 234 56 78',
      avatar_initials: 'AK'
    },
    {
      id: 'user_tashkent_1',
      user_id: 'user_tashkent_1',
      name: 'Rustam Rahimov',
      role: 'manager',
      company_id: 'comp_tashkent',
      company_name: 'Toshkent Stroy Invest',
      login: 'tashkent_mgr',
      password_hash: '123456',
      phone: '+998 97 999 88 77',
      avatar_initials: 'RR'
    },
    {
      id: 'user_nilufar',
      user_id: 'user_nilufar',
      name: 'Nilufar Rahimova',
      role: 'company_admin',
      company_id: 'uysot',
      company_name: 'UYSOT.UZ',
      login: 'nilufar',
      password_hash: 'uysot2026',
      phone: '+998 90 987 65 43',
      avatar_initials: 'NR'
    }
  ],
  objects: [],
  companyData: new Map(),
  routes: [],
  notifications: [],
  sessions: [],
  customFields: [
    { field_name: 'tjm_name', field_type: 'text', required: false, visible: true, column_letter: 'W' },
    { field_name: 'phone', field_type: 'phone', required: false, visible: true, column_letter: 'X' },
    { field_name: 'sales_office', field_type: 'text', required: false, visible: true, column_letter: 'Y' },
    { field_name: 'manager_name', field_type: 'text', required: false, visible: true, column_letter: 'Z' },
    { field_name: 'manager_phone', field_type: 'phone', required: false, visible: true, column_letter: 'AA' },
    { field_name: 'telegram', field_type: 'url', required: false, visible: true, column_letter: 'AB' },
    { field_name: 'instagram', field_type: 'url', required: false, visible: true, column_letter: 'AC' },
    { field_name: 'notes', field_type: 'textarea', required: false, visible: true, column_letter: 'AD' },
    { field_name: 'priority', field_type: 'select', required: false, visible: true, column_letter: 'AE' },
    { field_name: 'last_visit', field_type: 'date', required: false, visible: true, column_letter: 'AF' }
  ],
  activityLogs: [],
  initialized: false
};

function findDataFile(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'lib', filename),
    path.join(process.cwd(), 'web', 'src', 'lib', filename)
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
    } catch (_) {}
  }
  return null;
}

function initLocalStore() {
  if (localStore.initialized) return;
  try {
    const samarqandPath = findDataFile('real-sheets-data.json');
    if (samarqandPath) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ samarqandPath, 'utf-8');
      const json = JSON.parse(raw);
      if (Array.isArray(json.rows)) {
        json.rows.forEach((r: any) => {
          localStore.objects.push({ ...r, is_uysot: false });
        });
      }
    }

    const uysotPath = findDataFile('uysot-domtut-data.json');
    if (uysotPath) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ uysotPath, 'utf-8');
      const json = JSON.parse(raw);
      const rows = Array.isArray(json) ? json : (json.rows || []);
      rows.forEach((r: any) => {
        localStore.objects.push({ ...r, is_uysot: true });
      });
    }
  } catch (err) {
    console.warn('initLocalStore read warning:', err);
  }
  localStore.initialized = true;
}

function usesMemoryStore(): boolean {
  return !isPostgresConfigured();
}

function assertMemoryStoreAllowed(): void {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_DB !== '1') {
    throw new DatabaseUnavailableError('DATABASE_URL sozlanmagan');
  }
}

function splitStatements(script: string): string[] {
  return script.split(';').map(s => s.trim()).filter(s => s.length > 0);
}

// 4. PostgreSQL migration: runs once per server process and is skipped when the version is already applied.
let schemaReady: Promise<boolean> | null = null;

async function runMigrations(): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    assertMemoryStoreAllowed();
    initLocalStore();
    return false;
  }
  const [{ exists }] = await sql`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`;
  if (exists) {
    const applied = await sql`SELECT 1 FROM schema_migrations WHERE version = ${SCHEMA_VERSION}`;
    if (applied.length > 0) return true;
  }
  const statements = [...splitStatements(SCHEMA_SQL), ...splitStatements(MIGRATIONS_SQL)];
  await sql.transaction(txn => [
    ...statements.map(stmt => txn.query(stmt)),
    txn.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [SCHEMA_VERSION])
  ]);
  return true;
}

export function ensureDatabaseSchema(): Promise<boolean> {
  if (!schemaReady) {
    schemaReady = runMigrations().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Returns the SQL client, or null only when the in-memory development store is active. */
async function ready() {
  await ensureDatabaseSchema();
  if (usesMemoryStore()) {
    initLocalStore();
    return null;
  }
  return getSql()!;
}

const CRM_COLUMNS = [
  'tjm_name', 'phone', 'sales_office', 'manager_name', 'manager_phone', 'telegram',
  'instagram', 'notes', 'priority', 'last_visit', 'visited_by', 'visit_lat_lng'
] as const;
type CrmColumn = typeof CRM_COLUMNS[number];

/** A missing key means "leave unchanged" (null); an empty string means "clear the field". */
function pickCrmValues(data: Record<string, any>): Record<CrmColumn, string | null> {
  const picked = {} as Record<CrmColumn, string | null>;
  for (const col of CRM_COLUMNS) {
    picked[col] = col in data && data[col] !== undefined ? String(data[col] ?? '') : null;
  }
  return picked;
}

const NON_CUSTOM_KEYS = new Set<string>([...CRM_COLUMNS, 'source_id', 'company_id', 'user_id', 'is_custom_tjm', 'custom_object_json', 'custom_values']);

function pickCustomValues(data: Record<string, any>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!NON_CUSTOM_KEYS.has(key) && value !== undefined) values[key] = String(value ?? '');
  }
  return values;
}

function overrideToFields(row: any): Record<string, any> {
  const { custom_object_json, id, ...rest } = row;
  return rest;
}

/** A company's own value wins; an empty one falls back to what the source provides, such as a Domtut phone. */
function mergeOverride(base: any, override: any): Record<string, any> {
  const merged: Record<string, any> = { ...base, ...overrideToFields(override) };
  for (const col of CRM_COLUMNS) merged[col] = override[col] || base[col] || '';
  return merged;
}

// Source objects change only through the weekly sync, so this spares Neon's limited free compute and transfer.
const BASE_OBJECTS_TTL_MS = 5 * 60 * 1000;
const baseObjectsCache = new Map<string, { rows: any[]; at: number }>();

export function clearBaseObjectsCache(): void {
  baseObjectsCache.clear();
}

function customRowToObject(row: any): Record<string, any> {
  const json = row.custom_object_json || {};
  const crm: Record<string, string> = {};
  for (const col of CRM_COLUMNS) crm[col] = row[col] || json[col] || '';
  return {
    ...json,
    custom_values: row.custom_values || {},
    ...crm,
    tjm_name: crm.tjm_name || json.object_name || '',
    source_id: row.source_id,
    company_id: row.company_id,
    is_custom_tjm: true
  };
}

function toProfile(row: any, companyName?: string): UserProfile {
  return {
    id: row.user_id || row.id,
    user_id: row.user_id,
    name: row.name,
    login: row.login,
    role: row.role,
    company_id: row.company_id,
    company_name: companyName || row.company_name || row.company_id,
    phone: row.phone || '',
    avatarInitials: row.avatar_initials || 'U',
    avatar_url: row.avatar_url || '',
    data_source: row.data_source === 'uysot' ? 'uysot' : 'dshk'
  };
}

function memoryDataSource(companyId?: string | null): DataSource {
  const company: any = localStore.companies.find(c => c.company_id === companyId);
  return company?.data_source === 'uysot' || companyId === 'uysot' ? 'uysot' : 'dshk';
}

function isUniqueViolation(err: any): boolean {
  return err?.code === '23505';
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const memorySessions = new Map<string, { userId: string; expiresAt: number }>();

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// 5. Typed DB operations. With DATABASE_URL set, errors propagate so an API can never report a save that did not happen.
export const db = {
  isPostgres: () => isPostgresConfigured(),
  initSchema: ensureDatabaseSchema,

  /** Fetch objects with company isolation */
  getObjects: async (companyId?: string, isUysot?: boolean, targetId?: string): Promise<any[]> => {
    const sql = await ready();

    if (sql) {
      if (targetId) {
        const customRows = companyId && companyId !== 'system'
          ? await sql`SELECT * FROM company_data WHERE source_id = ${targetId} AND is_custom_tjm = true AND company_id = ${companyId} LIMIT 1`
          : await sql`SELECT * FROM company_data WHERE source_id = ${targetId} AND is_custom_tjm = true LIMIT 1`;
        if (customRows.length > 0) return [customRowToObject(customRows[0])];

        const base = await sql`SELECT * FROM objects WHERE source_id = ${targetId} LIMIT 1`;
        if (base.length === 0) return [];
        const overrides = companyId
          ? await sql`SELECT * FROM company_data WHERE source_id = ${targetId} AND company_id = ${companyId} LIMIT 1`
          : [];
        return [overrides.length > 0 ? mergeOverride(base[0], overrides[0]) : base[0]];
      }

      const cacheKey = String(isUysot);
      const cached = baseObjectsCache.get(cacheKey);
      let rows: any[];
      if (cached && Date.now() - cached.at < BASE_OBJECTS_TTL_MS) {
        rows = cached.rows;
      } else {
        rows = isUysot === true
          ? await sql`SELECT * FROM objects WHERE is_uysot = true`
          : isUysot === false
          ? await sql`SELECT * FROM objects WHERE is_uysot = false`
          : await sql`SELECT * FROM objects`;
        baseObjectsCache.set(cacheKey, { rows, at: Date.now() });
      }

      const overridesRes = companyId
        ? await sql`SELECT * FROM company_data WHERE company_id = ${companyId}`
        : [];
      const overrideMap = new Map<string, any>();
      const customList: any[] = [];
      overridesRes.forEach((r: any) => {
        if (r.is_custom_tjm) customList.push(customRowToObject(r));
        else overrideMap.set(String(r.source_id), r);
      });

      const merged = rows.map((r: any) => {
        const ov = overrideMap.get(String(r.source_id));
        return ov ? mergeOverride(r, ov) : r;
      });
      return [...customList, ...merged];
    }

    // High performance local fallback matching 100% PostgreSQL schema
    let list = localStore.objects;
    if (isUysot !== undefined) {
      list = list.filter(o => isUysot ? (o.is_uysot || String(o.source_id).startsWith('domtut_')) : (!o.is_uysot && !String(o.source_id).startsWith('domtut_')));
    }

    if (targetId) {
      // 1. Check if targetId is custom TJM in companyData
      if (companyId) {
        const customOv = localStore.companyData.get(`${companyId}_${targetId}`);
        if (customOv && customOv.is_custom_tjm) {
          return [customOv];
        }
      } else {
        for (const [, val] of localStore.companyData.entries()) {
          if (val && val.is_custom_tjm && String(val.source_id).trim() === targetId.trim()) {
            return [val];
          }
        }
      }

      // 2. Query base objects
      const found = list.find(o => String(o.source_id).trim() === targetId.trim());
      if (!found) return [];
      const ovKey = `${companyId || 'comp_default'}_${targetId}`;
      const ov = localStore.companyData.get(ovKey);
      return [ov ? { ...found, ...ov } : found];
    }

    // Custom TJMs belong to the company that created them, whatever its dataset is
    const customList: any[] = [];
    for (const [, val] of localStore.companyData.entries()) {
      if (val && val.is_custom_tjm && (!companyId || companyId === 'system' || val.company_id === companyId)) {
        customList.push(val);
      }
    }

    if (companyId) {
      list = list.map(r => {
        const ov = localStore.companyData.get(`${companyId}_${r.source_id}`);
        return ov ? { ...r, ...ov } : r;
      });
    }

    return [...customList, ...list];
  },

  /** Get single object detail */
  getObjectById: async (sourceId: string, companyId?: string): Promise<any | null> => {
    const list = await db.getObjects(companyId, undefined, sourceId);
    return list.length > 0 ? list[0] : null;
  },

  /** Partial upsert: only the keys present in data change, and an empty string clears a field. */
  updateCompanyData: async (
    companyId: string,
    userId: string,
    sourceId: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    const sql = await ready();

    if (sql) {
      const v = pickCrmValues(data);
      const provided = CRM_COLUMNS.filter(col => v[col] !== null);
      const customJson = JSON.stringify(pickCustomValues(data));
      await sql`
        INSERT INTO company_data (
          company_id, user_id, source_id, tjm_name, phone, sales_office,
          manager_name, manager_phone, telegram, instagram, notes,
          priority, last_visit, visited_by, visit_lat_lng, custom_values, updated_at
        ) VALUES (
          ${companyId}, ${userId}, ${sourceId},
          COALESCE(${v.tjm_name}::text, ''), COALESCE(${v.phone}::text, ''), COALESCE(${v.sales_office}::text, ''),
          COALESCE(${v.manager_name}::text, ''), COALESCE(${v.manager_phone}::text, ''), COALESCE(${v.telegram}::text, ''),
          COALESCE(${v.instagram}::text, ''), COALESCE(${v.notes}::text, ''), COALESCE(${v.priority}::text, ''),
          COALESCE(${v.last_visit}::text, ''), COALESCE(${v.visited_by}::text, ''), COALESCE(${v.visit_lat_lng}::text, ''),
          ${customJson}::jsonb, NOW()
        )
        ON CONFLICT (company_id, source_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          tjm_name = COALESCE(${v.tjm_name}::text, company_data.tjm_name),
          phone = COALESCE(${v.phone}::text, company_data.phone),
          sales_office = COALESCE(${v.sales_office}::text, company_data.sales_office),
          manager_name = COALESCE(${v.manager_name}::text, company_data.manager_name),
          manager_phone = COALESCE(${v.manager_phone}::text, company_data.manager_phone),
          telegram = COALESCE(${v.telegram}::text, company_data.telegram),
          instagram = COALESCE(${v.instagram}::text, company_data.instagram),
          notes = COALESCE(${v.notes}::text, company_data.notes),
          priority = COALESCE(${v.priority}::text, company_data.priority),
          last_visit = COALESCE(${v.last_visit}::text, company_data.last_visit),
          visited_by = COALESCE(${v.visited_by}::text, company_data.visited_by),
          visit_lat_lng = COALESCE(${v.visit_lat_lng}::text, company_data.visit_lat_lng),
          custom_values = company_data.custom_values || EXCLUDED.custom_values,
          custom_object_json = company_data.custom_object_json - ${provided}::text[],
          updated_at = NOW()
      `;
      return true;
    }

    const ovKey = `${companyId}_${sourceId}`;
    const existing = localStore.companyData.get(ovKey) || {};
    localStore.companyData.set(ovKey, { ...existing, ...data, company_id: companyId, source_id: sourceId });
    return true;
  },

  /** Clears a company's CRM fields. A company-created object keeps its building data. */
  clearCompanyData: async (companyId: string, sourceId: string): Promise<boolean> => {
    const sql = await ready();
    if (sql) {
      const crmKeys = [...CRM_COLUMNS];
      await sql.transaction(txn => [
        txn`DELETE FROM company_data WHERE company_id = ${companyId} AND source_id = ${sourceId} AND (is_custom_tjm = false OR is_custom_tjm IS NULL)`,
        txn`
          UPDATE company_data SET
            tjm_name = '', phone = '', sales_office = '', manager_name = '', manager_phone = '',
            telegram = '', instagram = '', notes = '', priority = '', last_visit = '', visited_by = '',
            visit_lat_lng = '', custom_values = '{}'::jsonb,
            custom_object_json = custom_object_json - ${crmKeys}::text[],
            updated_at = NOW()
          WHERE company_id = ${companyId} AND source_id = ${sourceId} AND is_custom_tjm = true
        `
      ]);
      return true;
    }
    const ovKey = `${companyId}_${sourceId}`;
    const existing = localStore.companyData.get(ovKey);
    if (existing?.is_custom_tjm) {
      const cleared: Record<string, any> = { ...existing };
      for (const col of CRM_COLUMNS) cleared[col] = '';
      localStore.companyData.set(ovKey, cleared);
    } else {
      localStore.companyData.delete(ovKey);
    }
    return true;
  },

  /** Get company-specific CRM overrides and custom TJMs */
  getCompanyData: async (companyId: string): Promise<{ overrides: Map<string, any>; customObjects: any[] }> => {
    const overrides = new Map<string, any>();
    const customObjects: any[] = [];
    if (!companyId) return { overrides, customObjects };

    const sql = await ready();
    if (sql) {
      const rows = companyId === 'system'
        ? await sql`SELECT * FROM company_data`
        : await sql`SELECT * FROM company_data WHERE company_id = ${companyId}`;
      for (const row of rows) {
        if (row.is_custom_tjm) customObjects.push(customRowToObject(row));
        else if (row.source_id) overrides.set(String(row.source_id), overrideToFields(row));
      }
      return { overrides, customObjects };
    }

    for (const [, rowObj] of localStore.companyData.entries()) {
      if (companyId !== 'system' && rowObj.company_id !== companyId) continue;
      if (rowObj.is_custom_tjm) customObjects.push(rowObj);
      else if (rowObj.source_id) overrides.set(String(rowObj.source_id), rowObj);
    }
    return { overrides, customObjects };
  },

  /** Create a company-owned object */
  createCompanyCustomTJM: async (
    companyId: string,
    userId: string,
    sourceId: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    const sql = await ready();
    if (sql) {
      const v = pickCrmValues(data);
      await sql`
        INSERT INTO company_data (
          company_id, user_id, source_id, is_custom_tjm, custom_object_json,
          tjm_name, phone, sales_office, manager_name, manager_phone, telegram,
          instagram, notes, priority, last_visit, visited_by, visit_lat_lng, updated_at
        ) VALUES (
          ${companyId}, ${userId}, ${sourceId}, true, ${JSON.stringify(data)}::jsonb,
          COALESCE(${v.tjm_name}::text, ''), COALESCE(${v.phone}::text, ''), COALESCE(${v.sales_office}::text, ''),
          COALESCE(${v.manager_name}::text, ''), COALESCE(${v.manager_phone}::text, ''), COALESCE(${v.telegram}::text, ''),
          COALESCE(${v.instagram}::text, ''), COALESCE(${v.notes}::text, ''), COALESCE(${v.priority}::text, ''),
          COALESCE(${v.last_visit}::text, ''), COALESCE(${v.visited_by}::text, ''), COALESCE(${v.visit_lat_lng}::text, ''),
          NOW()
        )
        ON CONFLICT (company_id, source_id) DO UPDATE SET
          is_custom_tjm = true,
          custom_object_json = EXCLUDED.custom_object_json,
          updated_at = NOW()
      `;
      return true;
    }
    localStore.companyData.set(`${companyId}_${sourceId}`, {
      ...data,
      company_id: companyId,
      source_id: sourceId,
      is_custom_tjm: true
    });
    return true;
  },

  /** Create a shared base object. An existing object is never overwritten from here. */
  createObject: async (newData: Record<string, any>): Promise<any> => {
    const sourceId = newData.source_id || `obj_${Date.now()}`;
    const lat = parseFloat(newData.latitude) || 39.6542;
    const lng = parseFloat(newData.longitude) || 66.9597;
    const isUysot = Boolean(newData.is_uysot || String(sourceId).startsWith('domtut_'));

    const item = {
      source_id: sourceId,
      object_name: newData.object_name || newData.tjm_name || 'Yangi bino',
      region_soato: newData.region_soato || (isUysot ? '1726' : '1718'),
      region_name: newData.region_name || (isUysot ? 'Toshkent shahri' : 'Samarqand'),
      district_soato: newData.district_soato || (isUysot ? '1726262' : '1718401'),
      district_name: newData.district_name || 'Shahar',
      address: newData.address || '',
      latitude: lat,
      longitude: lng,
      status: newData.status || 'Qurilish jarayonida',
      status_id: 1,
      sphere_id: '57',
      customer: newData.customer || '—',
      designer: newData.designer || '—',
      builder: newData.builder || '—',
      floors: newData.floors || '—',
      apartment_count: newData.apartment_count || '0',
      is_uysot: isUysot,
      created_at: new Date().toISOString()
    };

    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO objects (
          source_id, object_name, region_soato, region_name, district_soato, district_name,
          address, latitude, longitude, status, status_id, sphere_id, customer, designer,
          builder, floors, apartment_count, is_uysot, created_at
        ) VALUES (
          ${item.source_id}, ${item.object_name}, ${item.region_soato}, ${item.region_name},
          ${item.district_soato}, ${item.district_name}, ${item.address}, ${item.latitude},
          ${item.longitude}, ${item.status}, ${item.status_id}, ${item.sphere_id},
          ${item.customer}, ${item.designer}, ${item.builder}, ${item.floors},
          ${item.apartment_count}, ${item.is_uysot}, ${item.created_at}
        )
        ON CONFLICT (source_id) DO NOTHING
      `;
      return item;
    }
    localStore.objects.unshift(item);
    return item;
  },

  /** Companies */
  getCompanies: async (): Promise<Company[]> => {
    const sql = await ready();
    if (sql) {
      const rows = await sql`SELECT * FROM companies ORDER BY id ASC`;
      return rows.map((r: any) => ({
        company_id: r.company_id,
        company_name: r.company_name,
        status: r.status || 'active',
        data_source: r.data_source === 'uysot' ? 'uysot' : 'dshk',
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }
    return localStore.companies.map(c => ({ ...c, data_source: memoryDataSource(c.company_id) }));
  },

  getCompanyDataSource: async (companyId?: string | null): Promise<DataSource> => {
    if (!companyId) return 'dshk';
    const sql = await ready();
    if (sql) {
      const rows = await sql`SELECT data_source FROM companies WHERE company_id = ${companyId} LIMIT 1`;
      return rows[0]?.data_source === 'uysot' ? 'uysot' : 'dshk';
    }
    return memoryDataSource(companyId);
  },

  createCompany: async (name: string, status: string = 'active', dataSource: DataSource = 'dshk'): Promise<Company> => {
    const item: Company = {
      company_id: `comp_${Date.now()}`,
      company_name: name.trim(),
      status: (status as 'active' | 'inactive'),
      data_source: dataSource,
      created_at: new Date().toISOString()
    };
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO companies (company_id, company_name, status, data_source, created_at)
        VALUES (${item.company_id}, ${item.company_name}, ${item.status}, ${dataSource}, NOW())
      `;
      return item;
    }
    localStore.companies.push(item);
    return item;
  },

  /** Users. Password hashes never leave this module. */
  getUsers: async (): Promise<any[]> => {
    const sql = await ready();
    const rows: any[] = sql ? await sql`SELECT * FROM users ORDER BY id ASC` : localStore.users;
    return rows.map(({ password_hash, ...safe }) => safe);
  },

  createUser: async (userData: any): Promise<any> => {
    const password = String(userData.password || '');
    if (!password) throw new Error('Parol kiritilishi shart');
    const userId = userData.user_id || `user_${Date.now()}`;
    const name = String(userData.name || '');
    const item = {
      id: userId,
      user_id: userId,
      name,
      login: String(userData.login || '').trim().toLowerCase(),
      role: userData.role || 'manager',
      company_id: userData.company_id || 'comp_default',
      phone: userData.phone || '',
      avatar_initials: userData.avatar_initials || userData.avatarInitials || name.trim().slice(0, 2).toUpperCase() || 'U',
      created_at: new Date().toISOString()
    };
    const passwordHash = hashPassword(password);

    const sql = await ready();
    if (sql) {
      const inserted = await sql`
        INSERT INTO users (
          user_id, name, login, password_hash, role, company_id, phone, avatar_initials, created_at
        ) VALUES (
          ${item.user_id}, ${item.name}, ${item.login}, ${passwordHash},
          ${item.role}, ${item.company_id}, ${item.phone}, ${item.avatar_initials}, NOW()
        )
        ON CONFLICT (login) DO NOTHING
        RETURNING user_id
      `;
      if (inserted.length === 0) throw new DuplicateLoginError('Bunday login allaqachon mavjud');
      return item;
    }
    if (localStore.users.some(u => u.login.toLowerCase() === item.login)) {
      throw new DuplicateLoginError('Bunday login allaqachon mavjud');
    }
    localStore.users.push({ ...item, password_hash: passwordHash });
    return item;
  },

  /** Returns the updated user without its hash, or null when no such user exists. */
  updateUser: async (identifier: string, updates: any): Promise<any | null> => {
    const cleanId = String(identifier || '').trim();
    if (!cleanId) return null;
    const newPassword = updates.password ? String(updates.password) : null;
    const newHash = newPassword ? hashPassword(newPassword) : null;
    const newLogin = updates.login ? String(updates.login).trim().toLowerCase() : null;
    const newInitials = updates.avatar_initials || updates.avatarInitials || null;

    const sql = await ready();
    if (sql) {
      try {
        const rows = await sql`
          UPDATE users SET
            name = COALESCE(${updates.name ?? null}::text, name),
            login = COALESCE(${newLogin}::text, login),
            password_hash = COALESCE(${newHash}::text, password_hash),
            phone = COALESCE(${updates.phone ?? null}::text, phone),
            avatar_url = COALESCE(${updates.avatar_url ?? null}::text, avatar_url),
            avatar_initials = COALESCE(${newInitials}::text, avatar_initials)
          WHERE user_id = ${cleanId}
          RETURNING *
        `;
        if (rows.length === 0) return null;
        if (newHash) await sql`DELETE FROM auth_sessions WHERE user_id = ${rows[0].user_id}`;
        const { password_hash, ...safe } = rows[0];
        return safe;
      } catch (err) {
        if (isUniqueViolation(err)) throw new DuplicateLoginError('Bunday login allaqachon mavjud');
        throw err;
      }
    }

    const idx = localStore.users.findIndex(u => u.user_id === cleanId);
    if (idx === -1) return null;
    if (newLogin && localStore.users.some((u, i) => i !== idx && u.login.toLowerCase() === newLogin)) {
      throw new DuplicateLoginError('Bunday login allaqachon mavjud');
    }
    const { password, ...rest } = updates;
    localStore.users[idx] = {
      ...localStore.users[idx],
      ...rest,
      ...(newLogin ? { login: newLogin } : {}),
      ...(newHash ? { password_hash: newHash } : {})
    };
    if (newHash) {
      for (const [hash, session] of memorySessions) {
        if (session.userId === cleanId) memorySessions.delete(hash);
      }
    }
    const { password_hash, ...safe } = localStore.users[idx];
    return safe;
  },

  authenticateUser: async (login: string, pass: string): Promise<UserProfile | null> => {
    const cleanLogin = String(login || '').trim().toLowerCase();
    const sql = await ready();
    if (sql) {
      const rows = await sql`
        SELECT u.*, c.company_name, c.data_source
        FROM users u
        LEFT JOIN companies c ON c.company_id = u.company_id
        WHERE LOWER(u.login) = ${cleanLogin}
        LIMIT 1
      `;
      const user = rows[0];
      if (!user || !verifyPassword(pass, user.password_hash)) return null;
      if (!isHashedPassword(user.password_hash)) {
        // Legacy plaintext row: replace it the first time its owner logs in.
        await sql`UPDATE users SET password_hash = ${hashPassword(pass)} WHERE user_id = ${user.user_id}`;
      }
      return toProfile(user, user.company_name);
    }

    const user = localStore.users.find(u => u.login.toLowerCase() === cleanLogin);
    if (!user || !verifyPassword(pass, user.password_hash)) return null;
    const company = localStore.companies.find(c => c.company_id === user.company_id);
    return toProfile({ ...user, data_source: memoryDataSource(user.company_id) }, company?.company_name || user.company_name);
  },

  /** Verifies a password for an already identified user, for example before a password change. */
  checkUserPassword: async (userId: string, pass: string): Promise<boolean> => {
    const sql = await ready();
    if (sql) {
      const rows = await sql`SELECT password_hash FROM users WHERE user_id = ${userId} LIMIT 1`;
      return rows.length > 0 && verifyPassword(pass, rows[0].password_hash);
    }
    const user = localStore.users.find(u => u.user_id === userId);
    return Boolean(user) && verifyPassword(pass, user.password_hash);
  },

  /** Login sessions live in the database, so they survive restarts and deploys. */
  createAuthSession: async (userId: string): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    const sql = await ready();
    if (sql) {
      await sql`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})`;
      await sql`DELETE FROM auth_sessions WHERE expires_at < NOW()`;
    } else {
      memorySessions.set(tokenHash, { userId, expiresAt: expiresAt.getTime() });
    }
    return token;
  },

  getUserBySession: async (token: string): Promise<UserProfile | null> => {
    const tokenHash = hashSessionToken(token);
    const sql = await ready();
    if (sql) {
      const rows = await sql`
        SELECT u.*, c.company_name, c.data_source
        FROM auth_sessions s
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN companies c ON c.company_id = u.company_id
        WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
        LIMIT 1
      `;
      return rows.length > 0 ? toProfile(rows[0], rows[0].company_name) : null;
    }
    const session = memorySessions.get(tokenHash);
    if (!session || session.expiresAt < Date.now()) return null;
    const user = localStore.users.find(u => u.user_id === session.userId);
    if (!user) return null;
    const company = localStore.companies.find(c => c.company_id === user.company_id);
    return toProfile({ ...user, data_source: memoryDataSource(user.company_id) }, company?.company_name || user.company_name);
  },

  deleteAuthSession: async (token: string): Promise<void> => {
    const tokenHash = hashSessionToken(token);
    const sql = await ready();
    if (sql) await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`;
    else memorySessions.delete(tokenHash);
  },

  /** User Sessions (audit log) */
  getUserSessions: async (limit: number = 100): Promise<UserSession[]> => {
    const sql = await ready();
    if (sql) {
      const rows = await sql`SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT ${limit}`;
      return rows.map((r: any) => ({
        session_id: r.session_id,
        user_id: r.user_id,
        user_name: r.user_name,
        login: r.login,
        role: r.role,
        company_id: r.company_id,
        company_name: r.company_name,
        action: r.action,
        ip_address: r.ip_address || '',
        user_agent: r.user_agent || '',
        timestamp: r.timestamp || '',
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }
    return localStore.sessions.slice(0, limit);
  },

  recordUserSession: async (sessionData: Partial<UserSession>): Promise<boolean> => {
    const item: UserSession = {
      session_id: sessionData.session_id || `sess_${Date.now()}_${randomBytes(4).toString('hex')}`,
      user_id: sessionData.user_id || 'guest',
      user_name: sessionData.user_name || 'Foydalanuvchi',
      login: sessionData.login || '',
      role: sessionData.role || 'manager',
      company_id: sessionData.company_id || 'comp_default',
      company_name: sessionData.company_name || 'Asosiy Kompaniya',
      action: sessionData.action || 'login',
      ip_address: sessionData.ip_address || '',
      user_agent: sessionData.user_agent || '',
      timestamp: sessionData.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO user_sessions (
          session_id, user_id, user_name, login, role, company_id,
          company_name, action, ip_address, user_agent, timestamp, created_at
        ) VALUES (
          ${item.session_id}, ${item.user_id}, ${item.user_name}, ${item.login},
          ${item.role}, ${item.company_id}, ${item.company_name}, ${item.action},
          ${item.ip_address}, ${item.user_agent}, ${item.timestamp}, NOW()
        )
      `;
      return true;
    }
    localStore.sessions.unshift(item);
    return true;
  },

  /** Routes */
  getRoutes: async (companyId?: string): Promise<SavedRoute[]> => {
    const sql = await ready();
    if (sql) {
      const rows = companyId
        ? await sql`SELECT * FROM routes WHERE company_id = ${companyId} ORDER BY created_at DESC`
        : await sql`SELECT * FROM routes ORDER BY created_at DESC`;
      return rows.map((r: any) => ({
        id: r.route_id,
        company_id: r.company_id,
        user_id: r.user_id,
        user_name: r.user_name,
        route_name: r.route_name,
        start_name: r.start_name,
        start_lat: parseFloat(r.start_lat) || 0,
        start_lng: parseFloat(r.start_lng) || 0,
        end_name: r.end_name,
        end_lat: parseFloat(r.end_lat) || 0,
        end_lng: parseFloat(r.end_lng) || 0,
        distance_km: parseFloat(r.distance_km) || 0,
        duration_min: parseFloat(r.duration_min) || 0,
        tjm_count: parseInt(r.tjm_count) || 0,
        tjm_list: r.tjm_list || '',
        buffer_radius_m: parseInt(r.buffer_radius_m) || 200,
        notes: r.notes || '',
        status: r.status || 'active',
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }
    return companyId
      ? localStore.routes.filter(r => r.company_id === companyId)
      : localStore.routes;
  },

  saveRoute: async (routeData: Partial<SavedRoute>): Promise<SavedRoute> => {
    const item: SavedRoute = {
      id: routeData.id || `route_${Date.now()}_${randomBytes(4).toString('hex')}`,
      company_id: routeData.company_id || 'comp_default',
      user_id: routeData.user_id || '',
      user_name: routeData.user_name || '',
      route_name: routeData.route_name || 'Marshrut',
      start_name: routeData.start_name || '',
      start_lat: routeData.start_lat || 0,
      start_lng: routeData.start_lng || 0,
      end_name: routeData.end_name || '',
      end_lat: routeData.end_lat || 0,
      end_lng: routeData.end_lng || 0,
      distance_km: routeData.distance_km || 0,
      duration_min: routeData.duration_min || 0,
      tjm_count: routeData.tjm_count || 0,
      tjm_list: routeData.tjm_list || '',
      buffer_radius_m: routeData.buffer_radius_m || 200,
      notes: routeData.notes || '',
      status: routeData.status || 'active',
      created_at: new Date().toISOString()
    };
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO routes (
          route_id, company_id, user_id, user_name, route_name, start_name, start_lat,
          start_lng, end_name, end_lat, end_lng, distance_km, duration_min, tjm_count,
          tjm_list, buffer_radius_m, notes, status, created_at
        ) VALUES (
          ${item.id}, ${item.company_id}, ${item.user_id}, ${item.user_name},
          ${item.route_name}, ${item.start_name}, ${item.start_lat}, ${item.start_lng},
          ${item.end_name}, ${item.end_lat}, ${item.end_lng}, ${item.distance_km},
          ${item.duration_min}, ${item.tjm_count}, ${item.tjm_list}, ${item.buffer_radius_m},
          ${item.notes}, ${item.status}, NOW()
        )
      `;
      return item;
    }
    localStore.routes.unshift(item);
    return item;
  },

  /** Notifications */
  getNotifications: async (): Promise<WeeklySyncNotification[]> => {
    const sql = await ready();
    if (sql) {
      const rows = await sql`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`;
      return rows.map((r: any) => ({
        id: r.notif_id,
        title: r.title,
        summary: r.summary,
        timestamp: r.sync_date,
        new_count: r.new_count,
        by_region: r.by_region_json || {},
        new_objects: r.new_objects_json || [],
        is_read: r.is_read || false
      }));
    }
    return localStore.notifications;
  },

  saveNotification: async (notifData: Partial<WeeklySyncNotification>): Promise<WeeklySyncNotification> => {
    const item: WeeklySyncNotification = {
      id: notifData.id || `notif_${Date.now()}`,
      title: notifData.title || 'Haftalik yangilanish',
      summary: notifData.summary || '',
      timestamp: notifData.timestamp || new Date().toISOString(),
      new_count: notifData.new_count || 0,
      by_region: notifData.by_region || {},
      new_objects: notifData.new_objects || [],
      is_read: false
    };
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO notifications (
          notif_id, title, summary, sync_date, new_count, by_region_json, new_objects_json, is_read, created_at
        ) VALUES (
          ${item.id}, ${item.title}, ${item.summary}, ${item.timestamp}, ${item.new_count},
          ${JSON.stringify(item.by_region)}::jsonb, ${JSON.stringify(item.new_objects)}::jsonb, false, NOW()
        )
      `;
      return item;
    }
    localStore.notifications.unshift(item);
    return item;
  },

  /** Custom Fields: global ones have an empty company_id, the rest belong to one company. */
  getCustomFields: async (companyId?: string, includeHidden: boolean = false): Promise<CustomField[]> => {
    const sql = await ready();
    if (sql) {
      // A company's own row wins over the global field of the same name, which is how a company hides one.
      const rows = await sql`
        SELECT * FROM (
          SELECT DISTINCT ON (field_name) * FROM custom_fields
          WHERE company_id IN ('', ${companyId || ''})
          ORDER BY field_name, CASE WHEN company_id = '' THEN 1 ELSE 0 END
        ) f
        WHERE visible = true OR ${includeHidden}::boolean
        ORDER BY id ASC
      `;
      return rows.map((r: any) => ({
        field_name: r.field_name,
        field_type: r.field_type,
        required: r.required || false,
        visible: Boolean(r.visible),
        column_letter: r.column_letter || '',
        label: r.label || '',
        desc: r.description || ''
      }));
    }
    return localStore.customFields.filter((f: any) =>
      (!f.company_id || f.company_id === companyId) && (includeHidden || f.visible !== false)
    );
  },

  setCustomFieldVisibility: async (companyId: string, fieldName: string, visible: boolean): Promise<void> => {
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO custom_fields (company_id, field_name, field_type, required, visible, column_letter, label, description)
        SELECT ${companyId}, field_name, field_type, required, ${visible}::boolean, column_letter, label, description
        FROM custom_fields
        WHERE field_name = ${fieldName} AND company_id IN ('', ${companyId})
        ORDER BY CASE WHEN company_id = '' THEN 1 ELSE 0 END
        LIMIT 1
        ON CONFLICT (company_id, field_name) DO UPDATE SET visible = EXCLUDED.visible
      `;
      return;
    }
    const field: any = localStore.customFields.find((f: any) => f.field_name === fieldName);
    if (field) field.visible = visible;
  },

  addCustomField: async (fieldData: Partial<CustomField> & { label?: string; desc?: string }, companyId: string = ''): Promise<CustomField> => {
    const item: any = {
      field_name: fieldData.field_name || `field_${Date.now()}`,
      field_type: fieldData.field_type || 'text',
      required: Boolean(fieldData.required),
      visible: true,
      column_letter: fieldData.column_letter || '',
      label: fieldData.label || '',
      desc: fieldData.desc || '',
      company_id: companyId
    };
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO custom_fields (company_id, field_name, field_type, required, visible, column_letter, label, description, created_at)
        VALUES (${companyId}, ${item.field_name}, ${item.field_type}, ${item.required}, true, ${item.column_letter}, ${item.label}, ${item.desc}, NOW())
        ON CONFLICT (company_id, field_name) DO UPDATE SET
          visible = true, field_type = EXCLUDED.field_type, label = EXCLUDED.label, description = EXCLUDED.description
      `;
      return item;
    }
    const existingIdx = localStore.customFields.findIndex((f: any) => f.field_name === item.field_name && (f.company_id || '') === companyId);
    if (existingIdx !== -1) {
      localStore.customFields[existingIdx] = { ...localStore.customFields[existingIdx], ...item };
      return localStore.customFields[existingIdx];
    }
    localStore.customFields.push(item);
    return item;
  },

  /** Records one visit in the history. */
  addObjectVisit: async (visit: { company_id: string; source_id: string; user_id: string; visited_by: string; lat_lng: string }): Promise<void> => {
    const sql = await ready();
    if (sql) {
      await sql`
        INSERT INTO object_visits (company_id, source_id, user_id, visited_by, lat_lng)
        VALUES (${visit.company_id}, ${visit.source_id}, ${visit.user_id}, ${visit.visited_by}, ${visit.lat_lng})
      `;
      return;
    }
    localStore.activityLogs.push({ action: 'VISIT_HISTORY', ...visit, visited_at: new Date().toISOString() });
  },

  getObjectVisits: async (companyId: string, sourceId: string, limit: number = 20): Promise<any[]> => {
    const sql = await ready();
    if (sql) {
      return sql`
        SELECT visited_by, lat_lng, visited_at FROM object_visits
        WHERE company_id = ${companyId} AND source_id = ${sourceId}
        ORDER BY visited_at DESC LIMIT ${limit}
      `;
    }
    return localStore.activityLogs
      .filter(l => l.action === 'VISIT_HISTORY' && l.company_id === companyId && l.source_id === sourceId)
      .reverse()
      .slice(0, limit);
  },

  /** Best effort by design: losing an audit line must not fail a save that already succeeded. */
  logActivity: async (log: any): Promise<boolean> => {
    try {
      const sql = await ready();
      if (sql) {
        await sql`
          INSERT INTO activity_log (action, source_id, object_name, user_info, details, status, created_at)
          VALUES (
            ${log.action || 'INFO'}, ${log.source_id || ''}, ${log.object_name || ''},
            ${log.user || ''}, ${typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')},
            ${log.status || 'SUCCESS'}, NOW()
          )
        `;
        return true;
      }
      localStore.activityLogs.push({ ...log, created_at: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('Activity log write failed:', err);
      return false;
    }
  }
};
