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
// TIER 8: UYSOT.UZ, Nilufar User, Domtut.uz Scraper & Data Isolation Tests
// ============================================================================

defineTest('googleSheets.ts defines UYSOT_HEADERS and UYSOT_Objects methods', {
  tier: 8, milestone: 8, feature: 'UYSOT_SHEETS_SCHEMA',
  description: 'googleSheets.ts defines UYSOT_HEADERS, ensureUysotSheet, and getUysotObjectsFromSheet'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.match(content, /UYSOT_HEADERS/, 'googleSheets.ts must define UYSOT_HEADERS');
  assert.match(content, /ensureUysotSheet/, 'googleSheets.ts must export/contain ensureUysotSheet');
  assert.match(content, /export\s+async\s+function\s+getUysotObjectsFromSheet/, 'googleSheets.ts must export getUysotObjectsFromSheet');
  assert.ok(content.includes('UYSOT_Objects'), 'googleSheets.ts must target UYSOT_Objects worksheet');
  assert.ok(content.includes('uysot-domtut-data.json'), 'googleSheets.ts must support local fallback cache');
});

defineTest('googleSheets.ts provisions UYSOT.UZ company and Nilufar user', {
  tier: 8, milestone: 8, feature: 'UYSOT_PROVISIONING',
  description: 'UYSOT.UZ company and Nilufar company_admin are provisioned with data isolation'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.ok(content.includes("'uysot'"), "googleSheets.ts must include 'uysot' company id");
  assert.ok(content.includes('UYSOT.UZ'), 'googleSheets.ts must include UYSOT.UZ company name');
  assert.ok(content.includes("'nilufar'"), "googleSheets.ts must include 'nilufar' login");
  assert.ok(content.includes('Nilufar'), 'googleSheets.ts must include Nilufar user name');
  assert.ok(content.includes('uysot2026'), 'googleSheets.ts must support uysot2026 password authentication');
});

defineTest('api/objects/route.ts enforces strict data isolation for UYSOT.UZ', {
  tier: 8, milestone: 8, feature: 'DATA_ISOLATION_ROUTE',
  description: 'Requests with companyId uysot only return Domtut data; other companies only receive DSHK data'
}, () => {
  assert.ok(fileExistsInSrc('app/api/objects/route.ts'), 'app/api/objects/route.ts must exist');
  const content = readSrcFile('app/api/objects/route.ts');
  assert.match(content, /getUysotObjectsFromSheet/, 'Objects route must import getUysotObjectsFromSheet');
  assert.ok(content.includes("companyId === 'uysot'") || content.includes("company_id === 'uysot'"), 
    'Objects route must inspect companyId for uysot');
  assert.ok(content.includes('exportAllObjectsFromSheet') || content.includes('getObjectsFromSheet'), 
    'Objects route still retrieves DSHK objects for other companies');
});

defineTest('api/admin/sync-domtut endpoint exists and supports GET and POST', {
  tier: 8, milestone: 8, feature: 'DOMTUT_SYNC_API',
  description: 'Sync endpoint returns stats on GET and triggers collector on POST'
}, () => {
  assert.ok(fileExistsInSrc('app/api/admin/sync-domtut/route.ts'), 'app/api/admin/sync-domtut/route.ts must exist');
  const content = readSrcFile('app/api/admin/sync-domtut/route.ts');
  assert.match(content, /export\s+async\s+function\s+GET/, 'route.ts must export GET handler');
  assert.match(content, /export\s+async\s+function\s+POST/, 'route.ts must export POST handler');
  assert.ok(content.includes('domtut_collector.py'), 'POST handler must reference domtut_collector.py');
});

defineTest('lib/api.ts includes triggerDomtutSync and getDomtutStats', {
  tier: 8, milestone: 8, feature: 'DOMTUT_CLIENT_API',
  description: 'lib/api.ts exports triggerDomtutSync and getDomtutStats methods'
}, () => {
  const content = readSrcFile('lib/api.ts');
  assert.match(content, /triggerDomtutSync:/, 'api object must have triggerDomtutSync method');
  assert.match(content, /getDomtutStats:/, 'api object must have getDomtutStats method');
  assert.ok(content.includes('/api/admin/sync-domtut'), 'methods must query /api/admin/sync-domtut');
});

defineTest('app/admin/page.tsx renders Domtut sync trigger and UYSOT company badge', {
  tier: 8, milestone: 8, feature: 'DOMTUT_ADMIN_UI',
  description: 'Admin page provides Domtut sync trigger and highlights UYSOT data source'
}, () => {
  const content = readSrcFile('app/admin/page.tsx');
  assert.ok(content.includes('triggerDomtutSync'), 'admin page must call api.triggerDomtutSync');
  assert.ok(content.includes('Domtut') || content.includes('Toshkent'), 'admin page must display Domtut Toshkent button/badge');
  assert.ok(content.includes('uysot'), 'admin page must identify uysot company');
});

defineTest('app/page.tsx auto-selects Toshkent region for UYSOT user', {
  tier: 8, milestone: 8, feature: 'UYSOT_MAP_REGION',
  description: 'app/page.tsx switches selectedRegion to 1726 (Toshkent) when company is uysot'
}, () => {
  const content = readSrcFile('app/page.tsx');
  assert.ok(content.includes("'uysot'"), "page.tsx must check for 'uysot' company");
  assert.ok(content.includes("'1726'"), "page.tsx must set region to '1726' (Toshkent)");
});

defineTest('scraper/domtut_collector.py exists and handles Tashkent scraping and sheets writing', {
  tier: 8, milestone: 8, feature: 'DOMTUT_SCRAPER_SCRIPT',
  description: 'domtut_collector.py collects catalog data from domtut.uz and writes to UYSOT_Objects'
}, () => {
  const scraperPath = path.resolve(WEB_ROOT, '../scraper/domtut_collector.py');
  assert.ok(fs.existsSync(scraperPath), 'scraper/domtut_collector.py must exist');
  const code = fs.readFileSync(scraperPath, 'utf-8');
  assert.ok(code.includes('domtut.uz'), 'collector must query domtut.uz');
  assert.ok(code.includes('UYSOT_Objects'), 'collector must target UYSOT_Objects tab');
  assert.ok(code.includes('1726'), 'collector must assign SOATO 1726 for Toshkent');
});

defineTest('uysot-domtut-data.json contains 500+ valid Tashkent TJMs with 100% purity', {
  tier: 8, milestone: 8, feature: 'DOMTUT_DATASET_PURITY',
  description: 'Local cache has over 500 complexes, all with domtut_ prefix and Tashkent GPS coordinates'
}, () => {
  const jsonPath = path.resolve(WEB_ROOT, 'src/lib/uysot-domtut-data.json');
  assert.ok(fs.existsSync(jsonPath), 'uysot-domtut-data.json must exist');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const objects = JSON.parse(raw);
  assert.ok(objects.length >= 500, `Expected at least 500 objects, found ${objects.length}`);

  const nonDomtut = objects.filter((o: any) => !String(o.source_id).startsWith('domtut_'));
  assert.equal(nonDomtut.length, 0, '100% of objects in UYSOT dataset must have domtut_ prefix');

  const invalidCoords = objects.filter((o: any) => !o.latitude || !o.longitude || o.latitude < 40.0 || o.latitude > 42.5);
  assert.equal(invalidCoords.length, 0, '100% of UYSOT objects must fall inside Tashkent region');
});

defineTest('Zero-Leakage Matrix: UYSOT and Samarqand datasets have 0 overlapping objects', {
  tier: 8, milestone: 8, feature: 'ZERO_DATA_LEAKAGE_MATRIX',
  description: 'Mathematical intersection of UYSOT IDs and Samarqand DSHK IDs is strictly empty'
}, () => {
  const uysotJsonPath = path.resolve(WEB_ROOT, 'src/lib/uysot-domtut-data.json');
  const dshkJsonPath = path.resolve(WEB_ROOT, 'src/lib/real-sheets-data.json');
  assert.ok(fs.existsSync(uysotJsonPath), 'uysot-domtut-data.json must exist');
  assert.ok(fs.existsSync(dshkJsonPath), 'real-sheets-data.json must exist');

  const uysot = JSON.parse(fs.readFileSync(uysotJsonPath, 'utf-8'));
  const dshk = JSON.parse(fs.readFileSync(dshkJsonPath, 'utf-8'));
  const dshkRows = dshk.rows || [];

  const uysotIds = new Set(uysot.map((o: any) => String(o.source_id)));
  const dshkIds = new Set(dshkRows.map((o: any) => String(o.source_id)));

  // Strict intersection test
  const intersection = [...uysotIds].filter(id => dshkIds.has(id));
  assert.equal(intersection.length, 0, `Data leakage detected! Shared objects: ${intersection.join(', ')}`);

  // Ensure no domtut objects exist in DSHK Samarqand dataset
  const domtutInDshk = dshkRows.filter((o: any) => String(o.source_id).startsWith('domtut_'));
  assert.equal(domtutInDshk.length, 0, 'Zero Domtut objects must appear in Samarqand base dataset');
});

defineTest('Company_Data CRM overrides are strictly isolated by company_id', {
  tier: 8, milestone: 8, feature: 'CRM_COMPANY_ISOLATION',
  description: 'getCompanyDataFromSheet filters exclusively by companyId'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.ok(content.includes('rowObj.company_id !== companyId'), 'CRM overrides must strictly check rowObj.company_id !== companyId');
  assert.ok(content.includes('updateCompanyDataInSheet'), 'CRM update function must exist');
});

