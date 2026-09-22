import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc
} from './harness.ts';

// ============================================================================
// TIER 6: Weekly Sync Scraper & In-App Notifications Tests
// ============================================================================

defineTest('WeeklySyncNotification and NewBuildingItem types are defined in lib/types.ts', {
  tier: 6, milestone: 6, feature: 'NOTIF_TYPES',
  description: 'lib/types.ts defines types for weekly notifications and newly discovered buildings'
}, () => {
  const content = readSrcFile('lib/types.ts');
  assert.match(content, /export\s+interface\s+NewBuildingItem/, 'NewBuildingItem interface must be exported');
  assert.match(content, /export\s+interface\s+WeeklySyncNotification/, 'WeeklySyncNotification interface must be exported');
  assert.match(content, /new_count:\s*number/, 'WeeklySyncNotification must include new_count');
  assert.match(content, /new_objects:\s*NewBuildingItem\[\]/, 'WeeklySyncNotification must include new_objects array');
});

defineTest('googleSheets.ts implements saveNotificationToSheet and getNotificationsFromSheet', {
  tier: 6, milestone: 6, feature: 'SHEETS_NOTIFICATIONS',
  description: 'googleSheets.ts integrates Notifications sheet with append and read methods'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.match(content, /export\s+async\s+function\s+saveNotificationToSheet/, 'googleSheets.ts must export saveNotificationToSheet');
  assert.match(content, /export\s+async\s+function\s+getNotificationsFromSheet/, 'googleSheets.ts must export getNotificationsFromSheet');
  assert.match(content, /NOTIFICATION_HEADERS/, 'googleSheets.ts must define NOTIFICATION_HEADERS');
  assert.ok(content.includes('Notifications!A1:G'), 'saveNotificationToSheet targets Notifications range');
});

defineTest('/api/notifications route handler exists with GET and POST methods', {
  tier: 6, milestone: 6, feature: 'API_NOTIFICATIONS',
  description: 'src/app/api/notifications/route.ts exposes GET and POST endpoints'
}, () => {
  assert.ok(fileExistsInSrc('app/api/notifications/route.ts'), 'app/api/notifications/route.ts must exist');
  const content = readSrcFile('app/api/notifications/route.ts');
  assert.match(content, /export\s+async\s+function\s+GET/, 'route.ts must export GET handler');
  assert.match(content, /export\s+async\s+function\s+POST/, 'route.ts must export POST handler');
  assert.match(content, /getNotificationsFromSheet/, 'GET handler must invoke getNotificationsFromSheet');
  assert.match(content, /saveNotificationToSheet/, 'POST handler must invoke saveNotificationToSheet');
});

defineTest('/api/cron/weekly-sync route handler exists for automated scheduler', {
  tier: 6, milestone: 6, feature: 'API_CRON_SYNC',
  description: 'src/app/api/cron/weekly-sync/route.ts handles weekly scraper execution'
}, () => {
  assert.ok(fileExistsInSrc('app/api/cron/weekly-sync/route.ts'), 'app/api/cron/weekly-sync/route.ts must exist');
  const content = readSrcFile('app/api/cron/weekly-sync/route.ts');
  assert.match(content, /export\s+async\s+function\s+POST/, 'cron route must export POST handler');
  assert.ok(content.includes('weekly_sync.py'), 'cron route must reference weekly_sync.py script');
});

defineTest('scraper/weekly_sync.py implements full Uzbekistan fetch and diff engine', {
  tier: 6, milestone: 6, feature: 'SCRAPER_WEEKLY_SYNC',
  description: 'weekly_sync.py compares DSHK dataset against existing objects to find new ones'
}, () => {
  const scraperPath = path.resolve(process.cwd(), '..', 'scraper', 'weekly_sync.py');
  assert.ok(fs.existsSync(scraperPath), 'scraper/weekly_sync.py must exist');
  const content = fs.readFileSync(scraperPath, 'utf-8');
  assert.match(content, /def\s+fetch_all_uzbekistan_objects/, 'weekly_sync.py must define fetch_all_uzbekistan_objects');
  assert.match(content, /def\s+run_weekly_sync/, 'weekly_sync.py must define run_weekly_sync');
  assert.match(content, /sphere_id/, 'weekly_sync.py must filter by sphere_id');
});

defineTest('.github/workflows/weekly-sync.yml exists with weekly cron schedule', {
  tier: 6, milestone: 6, feature: 'GITHUB_WORKFLOW',
  description: 'GitHub Actions workflow runs weekly scraper automatically'
}, () => {
  const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'weekly-sync.yml');
  assert.ok(fs.existsSync(workflowPath), '.github/workflows/weekly-sync.yml must exist');
  const content = fs.readFileSync(workflowPath, 'utf-8');
  assert.ok(content.includes("cron: '0 3 * * 1'"), 'Workflow must be scheduled on Mondays');
  assert.ok(content.includes('weekly_sync.py'), 'Workflow must execute weekly_sync.py');
});

defineTest('Navbar.tsx renders Bell icon button and unread count badge', {
  tier: 6, milestone: 6, feature: 'UI_NAVBAR_BELL',
  description: 'Navbar includes Bell notification button with animated unread count badge'
}, () => {
  const content = readSrcFile('components/Header/Navbar.tsx');
  assert.match(content, /onOpenNotifications/, 'NavbarProps must include onOpenNotifications');
  assert.match(content, /unreadNotificationCount/, 'NavbarProps must include unreadNotificationCount');
  assert.match(content, /<Bell/, 'Navbar must render Bell icon');
});

defineTest('NotificationDrawer.tsx exists and renders weekly notifications with map action', {
  tier: 6, milestone: 6, feature: 'UI_DRAWER',
  description: 'NotificationDrawer renders list of weekly reports, region badges, and Xaritada ko\'rish'
}, () => {
  assert.ok(fileExistsInSrc('components/Notifications/NotificationDrawer.tsx'), 'NotificationDrawer.tsx must exist');
  const content = readSrcFile('components/Notifications/NotificationDrawer.tsx');
  assert.match(content, /export\s+default\s+function\s+NotificationDrawer/, 'Must export default NotificationDrawer');
  assert.ok(content.includes('Xaritada ko\'rish'), 'Must provide Xaritada ko\'rish action button');
  assert.match(content, /onSelectBuilding/, 'Must handle onSelectBuilding callback');
});

defineTest('FilterToolbar.tsx maintains clean map controls and NotificationDrawer filters older than 30 days', {
  tier: 6, milestone: 6, feature: 'FILTER_TOOLBAR_CLEAN',
  description: 'Map toolbar is free of notification buttons and NotificationDrawer enforces 30-day auto expiry'
}, () => {
  const toolbarContent = readSrcFile('components/Filters/FilterToolbar.tsx');
  assert.ok(!toolbarContent.includes('filterOnlyNew'), 'FilterToolbar must not have filterOnlyNew prop');
  
  const drawerContent = readSrcFile('components/Notifications/NotificationDrawer.tsx');
  assert.ok(drawerContent.includes('ONE_MONTH_MS') || drawerContent.includes('30 * 24 * 60 * 60 * 1000'), 'NotificationDrawer must enforce 30-day cutoff');
  assert.match(drawerContent, /timeB\s*-\s*timeA/, 'NotificationDrawer must sort newest first');
});

defineTest('app/page.tsx integrates NotificationDrawer, toast alert, and notification state', {
  tier: 6, milestone: 6, feature: 'PAGE_INTEGRATION',
  description: 'app/page.tsx manages notification state, unread counter, and drawer visibility'
}, () => {
  const content = readSrcFile('app/page.tsx');
  assert.match(content, /NotificationDrawer/, 'page.tsx must import and render NotificationDrawer');
  assert.match(content, /api\.getNotifications/, 'page.tsx must load notifications via api client');
  assert.match(content, /unreadNotifCount/, 'page.tsx must maintain unreadNotifCount state');
  assert.match(content, /handleSelectNewBuilding/, 'page.tsx must handle selecting building from notification');
});

defineTest('Notification building selection connects directly to map focus and flexible UI detail panels', {
  tier: 6, milestone: 6, feature: 'NOTIF_MAP_AND_UI_FOCUS',
  description: 'Selecting building from notifications triggers map flight, markers sync, and instant details panel'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  assert.match(pageContent, /focusTarget/, 'page.tsx must provide focusTarget state');
  assert.match(pageContent, /allMarkers/, 'page.tsx must merge notification objects into allMarkers');
  assert.match(pageContent, /formatBuildingItemToObjectDetail/, 'page.tsx must format immediate details for instant UI rendering');
  assert.match(pageContent, /<DynamicMap[^>]+focusTarget=\{focusTarget\}/, 'page.tsx must pass focusTarget to DynamicMap');

  const mapContent = readSrcFile('components/Map/MapContainer.tsx');
  assert.match(mapContent, /focusTarget/, 'MapContainer must accept focusTarget prop');
  assert.match(mapContent, /ResizeObserver/, 'MapContainer must adapt to flexible UI drawers with ResizeObserver');

  const apiContent = readSrcFile('lib/api.ts');
  assert.match(apiContent, /formatBuildingItemToObjectDetail/, 'api.ts must export formatBuildingItemToObjectDetail');
  assert.match(apiContent, /formatBuildingItemToMapObject/, 'api.ts must export formatBuildingItemToMapObject');
});

