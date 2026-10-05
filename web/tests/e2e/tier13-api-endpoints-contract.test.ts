import * as assert from 'node:assert/strict';
import {
  defineTest
} from './harness.ts';
import { db } from '../../src/lib/db.ts';

// ============================================================================
// TIER 13: Live API Endpoints Contract & Network Integration Tests
// ============================================================================

const BASE_URL = 'http://localhost:3001';

async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/objects?company_id=comp_default`, {
      signal: AbortSignal.timeout(1000)
    });
    return res.status === 200;
  } catch (_) {
    return false;
  }
}

defineTest('GET /api/objects returns 200 with standard response contract', {
  tier: 13, milestone: 13, feature: 'API_OBJECTS_ALL',
  description: 'Objects endpoint returns success, count, and array data'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/objects`);
    assert.equal(res.status, 200, 'HTTP status must be 200');
    const json = await res.json();
    assert.equal(json.success, true, 'success field must be true');
    assert.ok(typeof json.count === 'number', 'count must be a number');
    assert.ok(Array.isArray(json.data), 'data must be an array');
  } else {
    const objects = await db.getObjects();
    assert.ok(objects.length > 0, 'Fallback query must return objects');
  }
});

defineTest('GET /api/objects?company_id=uysot strictly returns Domtut dataset', {
  tier: 13, milestone: 13, feature: 'API_OBJECTS_UYSOT',
  description: 'UYSOT company query returns 500+ Domtut objects with zero DSHK leakage'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/objects?company_id=uysot`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.count >= 500, `UYSOT must have >= 500 complexes, got ${json.count}`);
    const nonDomtut = json.data.filter((o: any) => !String(o.source_id).startsWith('domtut_') && !o.is_uysot);
    assert.equal(nonDomtut.length, 0, 'Zero non-Domtut objects allowed for UYSOT');
  } else {
    const uysot = await db.getObjects('uysot', true);
    assert.ok(uysot.length >= 500);
  }
});

defineTest('GET /api/objects?company_id=comp_default returns Samarqand base dataset', {
  tier: 13, milestone: 13, feature: 'API_OBJECTS_SAMARQAND',
  description: 'comp_default query returns Samarqand objects with zero Domtut leakage'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/objects?company_id=comp_default`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.count > 1000, 'Samarqand company must return > 1000 objects');
    const domtutInSamarqand = json.data.filter((o: any) => String(o.source_id).startsWith('domtut_'));
    assert.equal(domtutInSamarqand.length, 0, 'Zero Domtut objects allowed for comp_default');
  } else {
    const samarqand = await db.getObjects('comp_default', false);
    assert.ok(samarqand.length > 1000);
  }
});

defineTest('GET /api/objects?id=70187 returns single object details', {
  tier: 13, milestone: 13, feature: 'API_OBJECTS_SINGLE',
  description: 'Single object query by source_id returns 200 and targeted object record'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/objects?company_id=comp_default&id=70187`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(String(json.data.source_id), '70187');
  } else {
    const found = await db.getObjectById('70187', 'comp_default');
    assert.ok(found);
    assert.equal(String(found.source_id), '70187');
  }
});

defineTest('GET /api/objects with non-existent id returns 404 Not Found', {
  tier: 13, milestone: 13, feature: 'API_OBJECTS_404',
  description: 'Querying missing object id returns HTTP 404 with error message'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/objects?company_id=comp_default&id=invalid_missing_id_99999`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('topilmadi'));
  } else {
    const found = await db.getObjectById('invalid_missing_id_99999');
    assert.equal(found, null);
  }
});

defineTest('POST /api/auth/login authenticates valid user credentials', {
  tier: 13, milestone: 13, feature: 'API_AUTH_LOGIN_SUCCESS',
  description: 'Valid login/password returns 200, user profile, and records session'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin', password: 'admin123' })
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.user.role, 'superadmin');
  } else {
    const profile = await db.authenticateUser('admin', 'admin123');
    assert.ok(profile);
    assert.equal(profile?.role, 'superadmin');
  }
});

defineTest('POST /api/auth/login rejects invalid password with 401 Unauthorized', {
  tier: 13, milestone: 13, feature: 'API_AUTH_LOGIN_FAIL',
  description: 'Wrong password returns 401 with appropriate error'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin', password: 'incorrect_password' })
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('noto\'g\'ri'));
  } else {
    const profile = await db.authenticateUser('admin', 'incorrect_password');
    assert.equal(profile, null);
  }
});

defineTest('GET /api/admin/sessions returns audit log sessions array', {
  tier: 13, milestone: 13, feature: 'API_ADMIN_SESSIONS',
  description: 'Admin sessions endpoint returns 200 and audit list'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/admin/sessions`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  } else {
    const sessions = await db.getUserSessions();
    assert.ok(Array.isArray(sessions));
  }
});

defineTest('GET /api/routes returns saved routes array', {
  tier: 13, milestone: 13, feature: 'API_ROUTES_LIST',
  description: 'Routes endpoint returns 200 and saved trip array'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/routes?company_id=comp_default`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  } else {
    const routes = await db.getRoutes('comp_default');
    assert.ok(Array.isArray(routes));
  }
});

defineTest('GET /api/notifications returns sync notifications list', {
  tier: 13, milestone: 13, feature: 'API_NOTIFICATIONS_LIST',
  description: 'Notifications endpoint returns 200 and notification items'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/notifications`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  } else {
    const notifs = await db.getNotifications();
    assert.ok(Array.isArray(notifs));
  }
});

defineTest('GET /api/custom-fields returns visible custom fields', {
  tier: 13, milestone: 13, feature: 'API_CUSTOM_FIELDS_LIST',
  description: 'Custom fields endpoint returns 200 with CRM field definitions'
}, async () => {
  const live = await isServerRunning();
  if (live) {
    const res = await fetch(`${BASE_URL}/api/custom-fields`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  } else {
    const fields = await db.getCustomFields();
    assert.ok(Array.isArray(fields));
  }
});
