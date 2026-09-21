import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc
} from './harness.ts';

// ============================================================================
// TIER 5: Routes Management, Google Sheets & Route Persistence Tests
// ============================================================================

defineTest('SavedRoute interface is defined in lib/types.ts', {
  tier: 5, milestone: 5, feature: 'ROUTES_SCHEMA',
  description: 'lib/types.ts defines SavedRoute interface with all 18 fields'
}, () => {
  const content = readSrcFile('lib/types.ts');
  assert.match(content, /export\s+interface\s+SavedRoute/, 'SavedRoute interface must be exported');
  assert.match(content, /id:\s*string/, 'SavedRoute must include id');
  assert.match(content, /company_id:\s*string/, 'SavedRoute must include company_id');
  assert.match(content, /start_lat:\s*number/, 'SavedRoute must include start_lat');
  assert.match(content, /start_lng:\s*number/, 'SavedRoute must include start_lng');
  assert.match(content, /end_lat:\s*number/, 'SavedRoute must include end_lat');
  assert.match(content, /end_lng:\s*number/, 'SavedRoute must include end_lng');
  assert.match(content, /distance_km:\s*number/, 'SavedRoute must include distance_km');
  assert.match(content, /duration_min:\s*number/, 'SavedRoute must include duration_min');
  assert.match(content, /tjm_count:\s*number/, 'SavedRoute must include tjm_count');
  assert.match(content, /tjm_list:\s*string/, 'SavedRoute must include tjm_list');
});

defineTest('googleSheets.ts implements saveRouteToSheet and getRoutesFromSheet', {
  tier: 5, milestone: 5, feature: 'SHEETS_ROUTES',
  description: 'googleSheets.ts integrates Routes sheet with append and read methods'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.match(content, /export\s+async\s+function\s+saveRouteToSheet/, 'googleSheets.ts must export saveRouteToSheet');
  assert.match(content, /export\s+async\s+function\s+getRoutesFromSheet/, 'googleSheets.ts must export getRoutesFromSheet');
  assert.match(content, /ROUTE_HEADERS/, 'googleSheets.ts must define ROUTE_HEADERS');
  assert.ok(content.includes('Routes!A1:R'), 'saveRouteToSheet targets Routes sheet range');
});

defineTest('/api/routes route handler exists with GET and POST methods', {
  tier: 5, milestone: 5, feature: 'API_ROUTES',
  description: 'src/app/api/routes/route.ts exposes GET and POST endpoints'
}, () => {
  assert.ok(fileExistsInSrc('app/api/routes/route.ts'), 'app/api/routes/route.ts must exist');
  const content = readSrcFile('app/api/routes/route.ts');
  assert.match(content, /export\s+async\s+function\s+GET/, 'route.ts must export GET handler');
  assert.match(content, /export\s+async\s+function\s+POST/, 'route.ts must export POST handler');
  assert.match(content, /getRoutesFromSheet/, 'GET handler must invoke getRoutesFromSheet');
  assert.match(content, /saveRouteToSheet/, 'POST handler must invoke saveRouteToSheet');
});

defineTest('lib/api.ts includes saveRoute and getSavedRoutes client methods', {
  tier: 5, milestone: 5, feature: 'API_CLIENT',
  description: 'api client provides saveRoute and getSavedRoutes helpers'
}, () => {
  const content = readSrcFile('lib/api.ts');
  assert.match(content, /saveRoute:\s*async/, 'api client must include saveRoute');
  assert.match(content, /getSavedRoutes:\s*async/, 'api client must include getSavedRoutes');
  assert.ok(content.includes('/api/routes'), 'api client routes to /api/routes endpoint');
});

defineTest('RoutePlannerView.tsx isolates active route storage per user account', {
  tier: 5, milestone: 5, feature: 'PERSISTENCE',
  description: 'Route persistence keys by account ID to ensure privacy between users'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /function\s+getAccountRouteStorageKey/, 'Must declare getAccountRouteStorageKey helper');
  assert.match(content, /b2b_active_route_/, 'Storage key must use b2b_active_route_ prefix');
  assert.match(content, /localStorage\.getItem\(storageKey\)/, 'RoutePlannerView restores from localStorage');
  assert.match(content, /localStorage\.setItem\(storageKey/, 'RoutePlannerView saves to localStorage');
});

defineTest('RoutePlannerView.tsx removes persisted route only when X or Clear is clicked', {
  tier: 5, milestone: 5, feature: 'PERSISTENCE_CLEAR',
  description: 'handleClearRoute explicitly removes route from account storage'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /handleClearRoute/, 'RoutePlannerView must implement handleClearRoute');
  assert.match(content, /localStorage\.removeItem\(storageKey\)/, 'handleClearRoute must call localStorage.removeItem');
  assert.match(content, /Bekor qilish \(X\)/, 'Summary card must display explicit Bekor qilish (X) button');
});

defineTest('RoutePlannerView.tsx includes Saqlanganlar modal and Sheets save button', {
  tier: 5, milestone: 5, feature: 'UI_INTEGRATION',
  description: 'RoutePlannerView renders Saqlanganlar button, modal, and Saqlash button'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /handleSaveRouteToSheets/, 'RoutePlannerView must define handleSaveRouteToSheets');
  assert.match(content, /fetchSavedRoutes/, 'RoutePlannerView must define fetchSavedRoutes');
  assert.match(content, /handleLoadSavedRoute/, 'RoutePlannerView must define handleLoadSavedRoute');
  assert.match(content, /showSavedRoutesModal/, 'RoutePlannerView must control showSavedRoutesModal');
  assert.match(content, /Saqlanganlar/, 'Header must display Saqlanganlar button');
});
