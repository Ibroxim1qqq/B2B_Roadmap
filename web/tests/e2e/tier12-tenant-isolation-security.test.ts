import * as assert from 'node:assert/strict';
import {
  defineTest
} from './harness.ts';
import { db } from '../../src/lib/db.ts';

// ============================================================================
// TIER 12: Multi-Tenant Enterprise Isolation & Security Matrix Tests
// ============================================================================

defineTest('Tenant CRM overrides are strictly isolated between competing companies', {
  tier: 12, milestone: 12, feature: 'TENANT_OVERRIDE_ISOLATION',
  description: 'Company A updates do not leak into Company B view for the same object'
}, async () => {
  const targetId = '70187';
  const companyA = 'comp_isolation_alpha';
  const companyB = 'comp_isolation_beta';

  // Company A adds proprietary CRM intelligence
  await db.updateCompanyData(companyA, 'user_a', targetId, {
    tjm_name: 'Alfa Sirli TJM',
    phone: '+998 90 111 11 11',
    manager_name: 'Jasur Alfa',
    notes: 'Maxfiy muzokaralar ketmoqda'
  });

  // Company B inspects the same object
  const viewB = await db.getObjectById(targetId, companyB);
  assert.ok(viewB, 'Object must exist for Company B');
  assert.notEqual(viewB.phone, '+998 90 111 11 11', 'Company A phone must never leak to Company B');
  assert.notEqual(viewB.manager_name, 'Jasur Alfa', 'Company A manager name must never leak to Company B');
  assert.notEqual(viewB.notes, 'Maxfiy muzokaralar ketmoqda', 'Company A notes must never leak to Company B');

  // Company A inspects object
  const viewA = await db.getObjectById(targetId, companyA);
  assert.equal(viewA.phone, '+998 90 111 11 11', 'Company A must see its own data');
  assert.equal(viewA.manager_name, 'Jasur Alfa', 'Company A must see its own manager');
});

defineTest('Company custom TJMs are completely isolated from other companies', {
  tier: 12, milestone: 12, feature: 'CUSTOM_TJM_ISOLATION',
  description: 'Custom complex created by Company A is absent from Company B object list'
}, async () => {
  const customId = `custom_leak_test_${Date.now()}`;
  const companyA = 'comp_isolation_a';
  const companyB = 'comp_isolation_b';

  await db.createCompanyCustomTJM(companyA, 'user_a', customId, {
    source_id: customId,
    object_name: 'Alfa Xususiy Majmua',
    tjm_name: 'Alfa Xususiy Majmua'
  });

  const listB = await db.getObjects(companyB);
  const leakedToB = listB.some(o => String(o.source_id) === customId);
  assert.equal(leakedToB, false, 'Custom TJM of Company A must never leak to Company B');

  const { customObjects: listA } = await db.getCompanyData(companyA);
  const foundInA = listA.some((c: any) => String(c.source_id) === customId);
  assert.equal(foundInA, true, 'Custom TJM must exist in Company A data');
});

defineTest('UYSOT Tashkent dataset and Samarqand DSHK dataset have zero leakage', {
  tier: 12, milestone: 12, feature: 'UYSOT_DSHK_BOUNDARY',
  description: 'UYSOT query returns only Domtut; standard company returns only DSHK'
}, async () => {
  const uysotObjects = await db.getObjects('uysot', true);
  assert.ok(uysotObjects.length > 0, 'UYSOT dataset must contain objects');
  const invalidInUysot = uysotObjects.filter(o => !String(o.source_id).startsWith('domtut_') && !o.is_uysot);
  assert.equal(invalidInUysot.length, 0, 'Zero non-Domtut objects allowed in UYSOT dataset');

  const samarqandObjects = await db.getObjects('comp_samarqand', false);
  assert.ok(samarqandObjects.length > 0, 'Samarqand dataset must contain objects');
  const invalidInSamarqand = samarqandObjects.filter(o => String(o.source_id).startsWith('domtut_') || o.is_uysot);
  assert.equal(invalidInSamarqand.length, 0, 'Zero Domtut objects allowed in Samarqand dataset');
});

defineTest('Saved routes are isolated per company account', {
  tier: 12, milestone: 12, feature: 'ROUTE_COMPANY_ISOLATION',
  description: 'Routes created by Company X are not returned in Company Y route query'
}, async () => {
  const routeId = `route_iso_${Date.now()}`;
  const companyX = 'comp_iso_x';
  const companyY = 'comp_iso_y';

  await db.saveRoute({
    id: routeId,
    company_id: companyX,
    route_name: 'Maxfiy Marshrut X',
    start_name: 'Boshlanish',
    start_lat: 39.65,
    start_lng: 66.96,
    end_name: 'Tugash',
    end_lat: 39.67,
    end_lng: 66.98
  });

  const routesY = await db.getRoutes(companyY);
  const leakedRoute = routesY.find(r => r.id === routeId);
  assert.equal(leakedRoute, undefined, 'Company X route must not appear in Company Y list');

  const routesX = await db.getRoutes(companyX);
  const foundX = routesX.find(r => r.id === routeId);
  assert.ok(foundX, 'Route must appear in Company X list');
});

defineTest('User authentication response strictly excludes password hash', {
  tier: 12, milestone: 12, feature: 'CREDENTIAL_PURITY',
  description: 'UserProfile returned by authenticateUser never exposes password_hash'
}, async () => {
  const profile = await db.authenticateUser('ibroxim', 'ibroxim2026');
  assert.ok(profile, 'ibroxim credentials must validate');

  assert.equal((profile as any).password_hash, undefined, 'password_hash must never be exposed');
  assert.equal((profile as any).password, undefined, 'password must never be exposed');
  assert.ok(profile?.id, 'UserProfile must contain user id');
  assert.ok(profile?.role, 'UserProfile must contain user role');
});

defineTest('SQL special characters and Uzbek apostrophes process safely without syntax errors', {
  tier: 12, milestone: 12, feature: 'SQL_INJECTION_SAFETY',
  description: 'Apostrophes, quotes, and malicious SQL sequences do not crash db query engine'
}, async () => {
  const injectionId = "70187' OR '1'='1";
  const result = await db.getObjectById(injectionId, 'comp_default');
  // Should safely return null without throwing an unhandled SQL injection exception
  assert.equal(result, null, 'SQL injection probe must safely return null without crash');

  const uzbekName = "O'zbekiston Temir Yo'llari MChJ — \"Sharq\" filiali";
  const ok = await db.updateCompanyData('comp_default', 'user_1', '70187', {
    tjm_name: uzbekName,
    notes: "O'rnatish bo'yicha ko'rsatma: 100% to'liq bajarildi."
  });
  assert.equal(ok, true, 'Uzbek special characters must save without error');

  const fetched = await db.getObjectById('70187', 'comp_default');
  assert.equal(fetched.tjm_name, uzbekName, 'Uzbek string with apostrophes must be preserved identically');
});

defineTest('Base government construction data remains immutable during CRM edits', {
  tier: 12, milestone: 12, feature: 'BASE_OBJECT_IMMUTABILITY',
  description: 'Updating company CRM data does not modify base fields like floors or builder'
}, async () => {
  const targetId = '70187';
  const initial = await db.getObjectById(targetId);
  assert.ok(initial, 'Base object must exist');

  const initialBuilder = initial.builder;
  const initialFloors = initial.floors;
  const initialDeadline = initial.deadline;

  // Company performs edits
  await db.updateCompanyData('comp_default', 'user_1', targetId, {
    tjm_name: 'Yangi Tahrir',
    phone: '+998 90 999 99 99',
    manager_name: 'Tahrirchi'
  });

  const updated = await db.getObjectById(targetId, 'comp_default');
  assert.equal(updated.builder, initialBuilder, 'Builder must remain unchanged');
  assert.equal(updated.floors, initialFloors, 'Floors must remain unchanged');
  assert.equal(updated.deadline, initialDeadline, 'Deadline must remain unchanged');
  assert.equal(updated.phone, '+998 90 999 99 99', 'Phone must reflect CRM update');
});
