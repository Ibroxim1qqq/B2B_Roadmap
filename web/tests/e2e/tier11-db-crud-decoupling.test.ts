import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc
} from './harness.ts';
import { db } from '../../src/lib/db.ts';
import * as googleSheets from '../../src/lib/googleSheets.ts';

// ============================================================================
// TIER 11: Database CRUD Operations & Google Sheets Decoupling Tests
// ============================================================================

defineTest('db.getObjects returns valid construction objects array', {
  tier: 11, milestone: 11, feature: 'DB_GET_OBJECTS',
  description: 'db.getObjects loads objects and applies region/dataset filtering'
}, async () => {
  const objects = await db.getObjects();
  assert.ok(Array.isArray(objects), 'db.getObjects must return an array');
  assert.ok(objects.length > 0, 'db.getObjects must return non-empty list of objects');

  const first = objects[0];
  assert.ok(first.source_id, 'Objects must have source_id');
  assert.ok(first.object_name, 'Objects must have object_name');
  assert.ok(typeof first.latitude === 'number' || typeof first.latitude === 'string', 'Objects must have latitude');
  assert.ok(typeof first.longitude === 'number' || typeof first.longitude === 'string', 'Objects must have longitude');
});

defineTest('db.getObjectById retrieves single object with company CRM data', {
  tier: 11, milestone: 11, feature: 'DB_GET_OBJECT_BY_ID',
  description: 'db.getObjectById returns targeted record or null if not found'
}, async () => {
  const objects = await db.getObjects();
  const sample = objects[0];
  assert.ok(sample, 'Need sample object');

  const found = await db.getObjectById(String(sample.source_id), 'comp_default');
  assert.ok(found, 'db.getObjectById must return existing object');
  assert.equal(String(found.source_id), String(sample.source_id), 'Retrieved object must match target source_id');

  const nonExistent = await db.getObjectById('non_existent_source_id_999999');
  assert.equal(nonExistent, null, 'db.getObjectById must return null for missing ID');
});

defineTest('db.updateCompanyData and db.getCompanyData persist tenant CRM overrides', {
  tier: 11, milestone: 11, feature: 'DB_UPDATE_COMPANY_DATA',
  description: 'db.updateCompanyData stores manager, phone, notes and preserves isolation'
}, async () => {
  const testSourceId = 'test_crud_obj_101';
  const testCompanyId = 'comp_test_crud';
  const testUserId = 'user_test_mgr';

  const updatePayload = {
    tjm_name: 'CRUD Test Majmuasi',
    phone: '+998 90 777 66 55',
    manager_name: 'Aziz Testov',
    notes: 'Maxsus test izohi',
    priority: 'High'
  };

  const success = await db.updateCompanyData(testCompanyId, testUserId, testSourceId, updatePayload);
  assert.equal(success, true, 'updateCompanyData must return true on success');

  const { overrides } = await db.getCompanyData(testCompanyId);
  assert.ok(overrides.has(testSourceId), 'getCompanyData must include the updated record');

  const saved = overrides.get(testSourceId);
  assert.equal(saved.phone, '+998 90 777 66 55', 'Phone must match payload');
  assert.equal(saved.manager_name, 'Aziz Testov', 'Manager name must match payload');
  assert.equal(saved.priority, 'High', 'Priority must match payload');
});

defineTest('db.createCompanyCustomTJM registers custom complex for company', {
  tier: 11, milestone: 11, feature: 'DB_CUSTOM_TJM',
  description: 'db.createCompanyCustomTJM creates custom object marked with is_custom_tjm'
}, async () => {
  const customId = `custom_tjm_${Date.now()}`;
  const companyId = 'comp_custom_test';
  const userId = 'user_custom_test';

  const customData = {
    source_id: customId,
    object_name: 'Yangi Mustaqil TJM',
    tjm_name: 'Yangi Mustaqil TJM',
    address: 'Samarqand shahri, Gagarin ko\'chasi',
    latitude: 39.655,
    longitude: 66.965,
    phone: '+998 93 111 22 33'
  };

  const ok = await db.createCompanyCustomTJM(companyId, userId, customId, customData);
  assert.equal(ok, true, 'createCompanyCustomTJM must return true');

  const { customObjects } = await db.getCompanyData(companyId);
  const found = customObjects.find((c: any) => String(c.source_id) === customId);
  assert.ok(found, 'Custom TJM must be present in company customObjects');
  assert.equal(found.object_name, 'Yangi Mustaqil TJM', 'Object name must match');
});

defineTest('db.authenticateUser validates credentials across roles', {
  tier: 11, milestone: 11, feature: 'DB_USERS_AUTH',
  description: 'db.authenticateUser verifies admin, company admin, and managers'
}, async () => {
  const adminUser = await db.authenticateUser('admin', 'admin123');
  assert.ok(adminUser, 'admin must authenticate with admin123');
  assert.equal(adminUser?.role, 'superadmin');

  const ibroximUser = await db.authenticateUser('ibroxim', 'ibroxim2026');
  assert.ok(ibroximUser, 'ibroxim must authenticate with ibroxim2026');
  assert.equal(ibroximUser?.company_id, 'comp_default');

  const nilufarUser = await db.authenticateUser('nilufar', 'uysot2026');
  assert.ok(nilufarUser, 'nilufar must authenticate with uysot2026');
  assert.equal(nilufarUser?.company_id, 'uysot');

  const invalid = await db.authenticateUser('admin', 'wrong_password_999');
  assert.equal(invalid, null, 'Invalid credentials must return null');
});

defineTest('db.recordUserSession and db.getUserSessions track user activity', {
  tier: 11, milestone: 11, feature: 'DB_USER_SESSIONS',
  description: 'db.recordUserSession saves audit record and db.getUserSessions retrieves list'
}, async () => {
  const sessionId = `test_sess_${Date.now()}`;
  const recorded = await db.recordUserSession({
    session_id: sessionId,
    user_id: 'user_session_test',
    user_name: 'Test Auditor',
    login: 'test_auditor',
    role: 'manager',
    company_id: 'comp_default',
    company_name: 'Asosiy Kompaniya',
    action: 'login',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome Test Runner'
  });

  assert.equal(recorded, true, 'recordUserSession must return true');

  const sessions = await db.getUserSessions();
  assert.ok(Array.isArray(sessions), 'getUserSessions must return array');
  const found = sessions.find((s: any) => s.session_id === sessionId);
  assert.ok(found, 'Session must exist in sessions list');
  assert.equal(found.user_name, 'Test Auditor');
});

defineTest('db.saveRoute and db.getRoutes persist and isolate navigator trips', {
  tier: 11, milestone: 11, feature: 'DB_ROUTES',
  description: 'db.saveRoute stores route data and db.getRoutes filters by company'
}, async () => {
  const routeId = `route_crud_${Date.now()}`;
  const companyId = 'comp_route_test';

  const saved = await db.saveRoute({
    id: routeId,
    company_id: companyId,
    user_id: 'user_planner',
    user_name: 'Menejer Dilshod',
    route_name: 'Registon - Bog\'ishamol',
    start_name: 'Registon Maydoni',
    start_lat: 39.6548,
    start_lng: 66.9758,
    end_name: 'Bog\'ishamol TJM',
    end_lat: 39.6700,
    end_lng: 66.9900,
    distance_km: 4.8,
    duration_min: 12,
    tjm_count: 5,
    tjm_list: '70187,70188',
    buffer_radius_m: 250,
    status: 'active'
  });

  assert.equal(saved.id, routeId, 'Saved route ID must match');

  const routes = await db.getRoutes(companyId);
  assert.ok(routes.length > 0, 'getRoutes must return saved route');
  const found = routes.find(r => r.id === routeId);
  assert.ok(found, 'Route must exist in company route list');
  assert.equal(found.route_name, 'Registon - Bog\'ishamol');
});

defineTest('db.saveNotification and db.getNotifications store sync alerts', {
  tier: 11, milestone: 11, feature: 'DB_NOTIFICATIONS',
  description: 'db.saveNotification stores weekly sync alert and db.getNotifications lists alerts'
}, async () => {
  const notifId = `notif_crud_${Date.now()}`;
  const saved = await db.saveNotification({
    id: notifId,
    title: 'Haftalik Samarqand test yangilanishi',
    summary: '3 ta yangi ko\'p xonadonli uy-joy aniqlandi',
    new_count: 3,
    timestamp: new Date().toISOString()
  });

  assert.equal(saved.id, notifId, 'Saved notification ID must match');

  const all = await db.getNotifications();
  assert.ok(all.length > 0, 'Notifications list must not be empty');
  const found = all.find(n => n.id === notifId);
  assert.ok(found, 'Notification must be found in list');
  assert.equal(found.new_count, 3);
});

defineTest('db.addCustomField and db.getCustomFields manage dynamic fields', {
  tier: 11, milestone: 11, feature: 'DB_CUSTOM_FIELDS',
  description: 'db.addCustomField adds new field and db.getCustomFields retrieves visible fields'
}, async () => {
  const fieldKey = `test_field_${Date.now()}`;
  const added = await db.addCustomField({
    field_name: fieldKey,
    field_type: 'phone',
    required: false,
    visible: true
  });

  assert.equal(added.field_name, fieldKey, 'Custom field key must match');

  const fields = await db.getCustomFields();
  const found = fields.find(f => f.field_name === fieldKey);
  assert.ok(found, 'Field must exist in custom fields list');
  assert.equal(found.field_type, 'phone');
});

defineTest('googleSheets.ts module decouples runtime from external Sheets API', {
  tier: 11, milestone: 11, feature: 'SHEETS_DECOUPLING',
  description: 'googleSheets.ts delegates calls directly to db client'
}, async () => {
  assert.ok(fileExistsInSrc('lib/googleSheets.ts'), 'lib/googleSheets.ts must exist');
  const content = readSrcFile('lib/googleSheets.ts');

  assert.ok(content.includes("from './db'") || content.includes("from './db.ts'"), 'googleSheets.ts must import from db.ts');
  assert.ok(content.includes('db.getObjects()'), 'exportAllObjectsFromSheet must invoke db.getObjects');
  assert.ok(content.includes('db.getRoutes'), 'getRoutesFromSheet must invoke db.getRoutes');
  assert.ok(content.includes('db.saveRoute'), 'saveRouteToSheet must invoke db.saveRoute');
  assert.ok(content.includes('db.recordUserSession'), 'recordUserSessionInSheet must invoke db.recordUserSession');
});
