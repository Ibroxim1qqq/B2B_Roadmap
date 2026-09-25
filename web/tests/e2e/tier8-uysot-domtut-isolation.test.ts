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
