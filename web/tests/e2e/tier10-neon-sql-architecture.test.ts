import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc,
  WEB_ROOT
} from './harness.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// TIER 10: Neon PostgreSQL Architecture & SQL Schema Tests
// ============================================================================

defineTest('schema.sql exists in root and web directory with valid PostgreSQL DDL', {
  tier: 10, milestone: 10, feature: 'SCHEMA_SQL_EXISTS',
  description: 'PostgreSQL DDL schema.sql exists in project root and web subdirectory'
}, () => {
  const rootSchema = path.resolve(WEB_ROOT, '../schema.sql');
  const webSchema = path.resolve(WEB_ROOT, 'schema.sql');

  assert.ok(fs.existsSync(rootSchema), 'schema.sql must exist at project root');
  assert.ok(fs.existsSync(webSchema), 'schema.sql must exist in web directory');

  const content = fs.readFileSync(rootSchema, 'utf-8');
  assert.ok(content.length > 500, 'schema.sql must not be empty');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS'), 'schema.sql must contain DDL statements');
});

defineTest('schema.sql defines all 9 relational database tables', {
  tier: 10, milestone: 10, feature: 'SCHEMA_TABLES_COUNT',
  description: 'Schema declares companies, users, objects, company_data, routes, notifications, user_sessions, custom_fields, activity_log'
}, () => {
  const rootSchema = path.resolve(WEB_ROOT, '../schema.sql');
  const content = fs.readFileSync(rootSchema, 'utf-8');

  const requiredTables = [
    'companies',
    'users',
    'objects',
    'company_data',
    'routes',
    'notifications',
    'user_sessions',
    'custom_fields',
    'activity_log'
  ];

  for (const table of requiredTables) {
    const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`, 'i');
    assert.match(content, pattern, `schema.sql must define table "${table}"`);
  }
});

defineTest('schema.sql creates essential database indexes for performance', {
  tier: 10, milestone: 10, feature: 'SCHEMA_INDEXES',
  description: 'Schema creates indexes on objects, company_data, routes, sessions, and notifications'
}, () => {
  const rootSchema = path.resolve(WEB_ROOT, '../schema.sql');
  const content = fs.readFileSync(rootSchema, 'utf-8');

  const requiredIndexes = [
    'idx_objects_source_id',
    'idx_objects_region',
    'idx_objects_is_uysot',
    'idx_company_data_cid_sid',
    'idx_routes_company_id',
    'idx_users_login',
    'idx_user_sessions_created',
    'idx_notifications_created'
  ];

  for (const idx of requiredIndexes) {
    assert.ok(content.includes(idx), `schema.sql must create index "${idx}"`);
  }
});

defineTest('schema.sql enforces multi-tenant unique constraint on company_data', {
  tier: 10, milestone: 10, feature: 'SCHEMA_CONSTRAINTS',
  description: 'company_data enforces CONSTRAINT uq_company_source UNIQUE (company_id, source_id)'
}, () => {
  const rootSchema = path.resolve(WEB_ROOT, '../schema.sql');
  const content = fs.readFileSync(rootSchema, 'utf-8');

  assert.ok(content.includes('uq_company_source'), 'Schema must define uq_company_source constraint');
  assert.ok(content.includes('UNIQUE (company_id, source_id)'), 'uq_company_source must cover (company_id, source_id)');
});

defineTest('@neondatabase/serverless driver is declared in package.json', {
  tier: 10, milestone: 10, feature: 'NEON_DRIVER_DEP',
  description: 'web/package.json includes @neondatabase/serverless dependency'
}, () => {
  const pkgPath = path.resolve(WEB_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  assert.ok(pkg.dependencies && pkg.dependencies['@neondatabase/serverless'], 
    'web/package.json must contain @neondatabase/serverless in dependencies');
});

defineTest('scripts/migrate-neon.ts exists and provides automated Neon migration', {
  tier: 10, milestone: 10, feature: 'MIGRATE_SCRIPT',
  description: 'Migration script reads schema.sql, executes DDL statements, and reports progress'
}, () => {
  const scriptPath = path.resolve(WEB_ROOT, 'scripts/migrate-neon.ts');
  assert.ok(fs.existsSync(scriptPath), 'web/scripts/migrate-neon.ts must exist');

  const content = fs.readFileSync(scriptPath, 'utf-8');
  assert.ok(content.includes('@neondatabase/serverless'), 'Migration script must import @neondatabase/serverless');
  assert.ok(content.includes('schema.sql'), 'Migration script must read schema.sql');
  assert.ok(content.includes('DATABASE_URL'), 'Migration script must resolve DATABASE_URL');
});

defineTest('scripts/seed-neon.ts exists and loads DSHK and Domtut datasets', {
  tier: 10, milestone: 10, feature: 'SEED_SCRIPT',
  description: 'Seed script reads real-sheets-data.json and uysot-domtut-data.json and seeds objects table'
}, () => {
  const scriptPath = path.resolve(WEB_ROOT, 'scripts/seed-neon.ts');
  assert.ok(fs.existsSync(scriptPath), 'web/scripts/seed-neon.ts must exist');

  const content = fs.readFileSync(scriptPath, 'utf-8');
  assert.ok(content.includes('real-sheets-data.json'), 'Seed script must reference real-sheets-data.json');
  assert.ok(content.includes('uysot-domtut-data.json'), 'Seed script must reference uysot-domtut-data.json');
  assert.ok(content.includes('@neondatabase/serverless'), 'Seed script must import @neondatabase/serverless');
});

defineTest('package.json provides db:migrate and db:seed scripts', {
  tier: 10, milestone: 10, feature: 'NPM_SCRIPTS',
  description: 'package.json exposes db:migrate and db:seed npm commands'
}, () => {
  const pkgPath = path.resolve(WEB_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  assert.ok(pkg.scripts && pkg.scripts['db:migrate'], 'package.json must provide db:migrate script');
  assert.ok(pkg.scripts && pkg.scripts['db:seed'], 'package.json must provide db:seed script');
  assert.ok(pkg.scripts['db:migrate'].includes('migrate-neon.ts'), 'db:migrate must run migrate-neon.ts');
  assert.ok(pkg.scripts['db:seed'].includes('seed-neon.ts'), 'db:seed must run seed-neon.ts');
});

defineTest('Environment example files configure DATABASE_URL for Neon DB', {
  tier: 10, milestone: 10, feature: 'ENV_EXAMPLES',
  description: 'Root .env.example and web/.env.example specify DATABASE_URL connection string'
}, () => {
  const rootEnv = path.resolve(WEB_ROOT, '../.env.example');
  const webEnv = path.resolve(WEB_ROOT, '.env.example');

  assert.ok(fs.existsSync(rootEnv), 'Root .env.example must exist');
  assert.ok(fs.existsSync(webEnv), 'web/.env.example must exist');

  const rootContent = fs.readFileSync(rootEnv, 'utf-8');
  const webContent = fs.readFileSync(webEnv, 'utf-8');

  assert.ok(rootContent.includes('DATABASE_URL'), 'Root .env.example must declare DATABASE_URL');
  assert.ok(webContent.includes('DATABASE_URL'), 'web/.env.example must declare DATABASE_URL');
  assert.ok(webContent.includes('neon.tech'), 'web/.env.example must reference neon.tech endpoint format');
});

defineTest('lib/db.ts exports complete Neon database interface and typed client', {
  tier: 10, milestone: 10, feature: 'DB_MODULE_EXPORTS',
  description: 'lib/db.ts exports getDatabaseUrl, isPostgresConfigured, ensureDatabaseSchema, SCHEMA_SQL, and db client'
}, () => {
  assert.ok(fileExistsInSrc('lib/db.ts'), 'src/lib/db.ts must exist');
  const content = readSrcFile('lib/db.ts');

  assert.match(content, /export\s+function\s+getDatabaseUrl/, 'db.ts must export getDatabaseUrl');
  assert.match(content, /export\s+function\s+isPostgresConfigured/, 'db.ts must export isPostgresConfigured');
  assert.match(content, /export\s+async\s+function\s+ensureDatabaseSchema/, 'db.ts must export ensureDatabaseSchema');
  assert.match(content, /export\s+const\s+SCHEMA_SQL/, 'db.ts must export SCHEMA_SQL');
  assert.match(content, /export\s+const\s+db\s*=/, 'db.ts must export db client object');
});
