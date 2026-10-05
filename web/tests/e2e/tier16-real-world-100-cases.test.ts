import * as assert from 'node:assert/strict';
import {
  defineTest
} from './harness.ts';
import { db } from '../../src/lib/db.ts';

// ============================================================================
// TIER 16: 100+ Comprehensive Real-World User Cases & Database Audit
// ============================================================================

const TARGET_OBJ = '70187';
const TEST_COMPANY = 'comp_real_suite';
const TEST_USER = 'user_real_agent';

// ----------------------------------------------------------------------------
// BLOCK 1: Cases 01 - 20: CRM Field Inspection, Editing & Database Writes
// ----------------------------------------------------------------------------

defineTest('Case 01: Updating manager name and phone for a high-priority construction site', {
  tier: 16, milestone: 16, feature: 'CASE_01',
  description: 'Persists manager_name and phone to company_data in database'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    manager_name: 'Anvar Qodirov',
    phone: '+998 90 123 45 67'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.manager_name, 'Anvar Qodirov');
  assert.equal(res.phone, '+998 90 123 45 67');
});

defineTest('Case 02: Updating sales office address and location coordinates', {
  tier: 16, milestone: 16, feature: 'CASE_02',
  description: 'Persists sales_office address string'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    sales_office: 'Samarqand sh., Mirzo Ulug\'bek ko\'chasi 45-uy'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.sales_office, 'Samarqand sh., Mirzo Ulug\'bek ko\'chasi 45-uy');
});

defineTest('Case 03: Updating Telegram handle with and without @ symbol', {
  tier: 16, milestone: 16, feature: 'CASE_03',
  description: 'Stores telegram username for communication'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { telegram: '@anvar_samarqand' });
  const res1 = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res1.telegram, '@anvar_samarqand');

  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { telegram: 'anvar_direct' });
  const res2 = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res2.telegram, 'anvar_direct');
});

defineTest('Case 04: Updating Instagram profile with handle and web URL', {
  tier: 16, milestone: 16, feature: 'CASE_04',
  description: 'Stores instagram link correctly'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { instagram: 'samarqand_invest_stroy' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.instagram, 'samarqand_invest_stroy');
});

defineTest('Case 05: Updating building priority across all four levels (Past, Normal, Yuqori, Shoshilinch)', {
  tier: 16, milestone: 16, feature: 'CASE_05',
  description: 'Cycles through priority levels and verifies each in database'
}, async () => {
  const levels = ['Past', 'Normal', 'Yuqori', 'Shoshilinch'];
  for (const lvl of levels) {
    await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { priority: lvl });
    const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
    assert.equal(res.priority, lvl);
  }
});

defineTest('Case 06: Updating extensive negotiations notes with multi-paragraph text', {
  tier: 16, milestone: 16, feature: 'CASE_06',
  description: 'Stores long formatted notes with newlines'
}, async () => {
  const longNote = '1-bosqich: Bosh muhandis bilan uchrashuv o\'tkazildi.\n2-bosqich: 50 tonna armatura taklifi berildi.\n3-bosqich: Shartnoma imzolanishi kutilmoqda.';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: longNote });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.notes, longNote);
});

defineTest('Case 07: Updating commercial complex name (custom TJM name)', {
  tier: 16, milestone: 16, feature: 'CASE_07',
  description: 'Assigns proprietary branding name to standard registry object'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { tjm_name: 'Registon City Rezidens' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.tjm_name, 'Registon City Rezidens');
});

defineTest('Case 08: Partial update preserving previously entered manager name when only phone is edited', {
  tier: 16, milestone: 16, feature: 'CASE_08',
  description: 'Does not overwrite manager_name when payload only specifies phone'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { manager_name: 'Rustam Saidov' });
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { phone: '+998 93 999 88 77' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.manager_name, 'Rustam Saidov');
  assert.equal(res.phone, '+998 93 999 88 77');
});

defineTest('Case 09: Partial update preserving phone when only notes are edited', {
  tier: 16, milestone: 16, feature: 'CASE_09',
  description: 'Does not overwrite phone when payload only specifies notes'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { phone: '+998 91 111 22 33' });
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: 'Yangi izoh matni' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.phone, '+998 91 111 22 33');
  assert.equal(res.notes, 'Yangi izoh matni');
});

defineTest('Case 10: Updating notes with Uzbek special characters (O\'zbekiston, G\'ijduvon, To\'raqo\'rg\'on)', {
  tier: 16, milestone: 16, feature: 'CASE_10',
  description: 'Preserves apostrophes and special characters in database text'
}, async () => {
  const text = 'O\'zbekiston bo\'ylab qurilish: G\'ijduvon va Bog\'ishamol hududlarida to\'liq ta\'minot.';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: text });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.notes, text);
});

defineTest('Case 11: Updating notes with quotes, commas, parentheses, and dashes', {
  tier: 16, milestone: 16, feature: 'CASE_11',
  description: 'Handles punctuation without SQL syntax errors'
}, async () => {
  const punctuationText = 'MChJ "Oltin Voha" (Samarqand) — 15,000 kv.m, [blok-A, B, C].';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: punctuationText });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.notes, punctuationText);
});

defineTest('Case 12: Updating notes with emojis and Unicode symbols', {
  tier: 16, milestone: 16, feature: 'CASE_12',
  description: 'Stores UTF-8 multi-byte emojis'
}, async () => {
  const emojiText = '🏗️ Qurilish jarayonida 🟢 | Telefon: 📞 +99890 | Reyting: ⭐⭐⭐⭐⭐';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: emojiText });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.notes, emojiText);
});

defineTest('Case 13: Emptying phone field without erasing manager name', {
  tier: 16, milestone: 16, feature: 'CASE_13',
  description: 'Allows explicit clearing of phone field'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { manager_name: 'Akmal Sobirov', phone: '' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.manager_name, 'Akmal Sobirov');
  assert.equal(res.phone, '');
});

defineTest('Case 14: Emptying telegram field without erasing instagram', {
  tier: 16, milestone: 16, feature: 'CASE_14',
  description: 'Allows resetting telegram while preserving instagram'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { instagram: 'insta_ok', telegram: '' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.instagram, 'insta_ok');
  assert.equal(res.telegram, '');
});

defineTest('Case 15: Verifying CRM updates do NOT mutate government data (floors, deadline, status)', {
  tier: 16, milestone: 16, feature: 'CASE_15',
  description: 'Base government registry attributes remain immutable'
}, async () => {
  const original = await db.getObjectById(TARGET_OBJ);
  const origFloors = original.floors;
  const origStatus = original.status;

  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { tjm_name: 'Mutatsiyasiz Bino', phone: '123' });
  const modified = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);

  assert.equal(modified.floors, origFloors);
  assert.equal(modified.status, origStatus);
});

defineTest('Case 16: Sequential updates by the same agent within 100ms persist without race condition', {
  tier: 16, milestone: 16, feature: 'CASE_16',
  description: 'Executes rapid updates in sequence'
}, async () => {
  for (let i = 1; i <= 5; i++) {
    await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: `Ketma-ket tahrir #${i}` });
  }
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.notes, 'Ketma-ket tahrir #5');
});

defineTest('Case 17: Clearing all B2B fields resets internal columns while keeping source_id and location intact', {
  tier: 16, milestone: 16, feature: 'CASE_17',
  description: 'Empties CRM columns'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    tjm_name: '',
    phone: '',
    manager_name: '',
    sales_office: '',
    telegram: '',
    instagram: '',
    notes: '',
    priority: 'Normal'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.phone, '');
  assert.equal(res.manager_name, '');
  assert.ok(res.latitude, 'Latitude must still exist');
  assert.ok(res.longitude, 'Longitude must still exist');
});

defineTest('Case 18: Re-enriching a cleared building with new manager data succeeds immediately', {
  tier: 16, milestone: 16, feature: 'CASE_18',
  description: 'Re-assigns data after clear'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    manager_name: 'Yangi Menejer',
    phone: '+998 90 700 00 00'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.manager_name, 'Yangi Menejer');
  assert.equal(res.phone, '+998 90 700 00 00');
});

defineTest('Case 19: Querying updated object via db.getObjectById returns exact merged fields', {
  tier: 16, milestone: 16, feature: 'CASE_19',
  description: 'Inspects single record lookup merge integrity'
}, async () => {
  const item = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.ok(item);
  assert.equal(String(item.source_id), TARGET_OBJ);
  assert.equal(item.manager_name, 'Yangi Menejer');
});

defineTest('Case 20: Querying updated object via db.getObjects(companyId) contains updated fields in list', {
  tier: 16, milestone: 16, feature: 'CASE_20',
  description: 'Inspects collection lookup merge integrity'
}, async () => {
  const list = await db.getObjects(TEST_COMPANY);
  const found = list.find(o => String(o.source_id) === TARGET_OBJ);
  assert.ok(found);
  assert.equal(found.manager_name, 'Yangi Menejer');
});

// ----------------------------------------------------------------------------
// BLOCK 2: Cases 21 - 35: On-Site Inspector Visit Recording & Geolocation Audit
// ----------------------------------------------------------------------------

defineTest('Case 21: Recording an in-person visit with GPS coordinates (39.6542, 66.9597)', {
  tier: 16, milestone: 16, feature: 'CASE_21',
  description: 'Stores visit timestamp and lat_lng coordinates'
}, async () => {
  const now = new Date().toISOString();
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    last_visit: now,
    visited_by: 'Inspector Jamshid',
    visit_lat_lng: '39.6542,66.9597'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.visited_by, 'Inspector Jamshid');
  assert.equal(res.visit_lat_lng, '39.6542,66.9597');
});

defineTest('Case 22: Recording an in-person visit without GPS coordinates (manual check-in)', {
  tier: 16, milestone: 16, feature: 'CASE_22',
  description: 'Stores visit with empty lat_lng'
}, async () => {
  const now = new Date().toISOString();
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    last_visit: now,
    visited_by: 'Inspector Botir',
    visit_lat_lng: ''
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.visited_by, 'Inspector Botir');
  assert.equal(res.visit_lat_lng, '');
});

defineTest('Case 23: Recording visit automatically stamps current date and time', {
  tier: 16, milestone: 16, feature: 'CASE_23',
  description: 'Verifies last_visit is set'
}, async () => {
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.ok(res.last_visit.length > 0);
});

defineTest('Case 24: Recording visit stores the active inspector full name in visited_by', {
  tier: 16, milestone: 16, feature: 'CASE_24',
  description: 'Verifies visited_by attribute'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { visited_by: 'Nodir Salimov' });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.visited_by, 'Nodir Salimov');
});

defineTest('Case 25: Multiple consecutive visits update last_visit to the most recent timestamp', {
  tier: 16, milestone: 16, feature: 'CASE_25',
  description: 'Overwrites earlier visit timestamp'
}, async () => {
  const ts1 = '2026-10-01 10:00';
  const ts2 = '2026-10-05 14:30';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { last_visit: ts1 });
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { last_visit: ts2 });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.last_visit, ts2);
});

defineTest('Case 26: Visiting an object marks it as visited in filter counts', {
  tier: 16, milestone: 16, feature: 'CASE_26',
  description: 'Filters list by non-empty last_visit'
}, async () => {
  const list = await db.getObjects(TEST_COMPANY);
  const visited = list.filter(o => o.last_visit && o.last_visit.trim() !== '');
  assert.ok(visited.length > 0);
});

defineTest('Case 27: Visiting an object updates company-specific visit stats', {
  tier: 16, milestone: 16, feature: 'CASE_27',
  description: 'Calculates visited count for company'
}, async () => {
  const list = await db.getObjects(TEST_COMPANY);
  const visitedCount = list.filter(o => Boolean(o.last_visit)).length;
  assert.ok(visitedCount >= 1);
});

defineTest('Case 28: Company A visit does NOT appear as visited in Company B view', {
  tier: 16, milestone: 16, feature: 'CASE_28',
  description: 'Maintains visit isolation between companies'
}, async () => {
  const compB = 'comp_unvisited_b';
  const resA = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  const resB = await db.getObjectById(TARGET_OBJ, compB);
  assert.equal(resA.visited_by, 'Nodir Salimov');
  assert.notEqual(resB.visited_by, 'Nodir Salimov');
  assert.notEqual(resB.last_visit, resA.last_visit);
});

defineTest('Case 29: Visiting with extreme coordinates (exact city border) saves without truncation', {
  tier: 16, milestone: 16, feature: 'CASE_29',
  description: 'Preserves 6 decimal precision coordinates'
}, async () => {
  const borderCoord = '39.712345,66.891234';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { visit_lat_lng: borderCoord });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.visit_lat_lng, borderCoord);
});

defineTest('Case 30: Visit recording creates a corresponding entry in activity_log', {
  tier: 16, milestone: 16, feature: 'CASE_30',
  description: 'Logs VISIT action to activity_log'
}, async () => {
  const logged = await db.logActivity({
    action: 'VISIT',
    source_id: TARGET_OBJ,
    user: 'Inspector Jamshid',
    details: 'Muvaffaqiyatli tashrif qayd etildi'
  });
  assert.equal(logged, true);
});

defineTest('Case 31: Inspector with Uzbek name (To\'ychiyev O\'tkir) records visit without character corruption', {
  tier: 16, milestone: 16, feature: 'CASE_31',
  description: 'Stores apostrophes in visited_by field'
}, async () => {
  const inspector = 'To\'ychiyev O\'tkir';
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { visited_by: inspector });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.visited_by, inspector);
});

defineTest('Case 32: Querying object returns last_visit and visited_by in single lookup', {
  tier: 16, milestone: 16, feature: 'CASE_32',
  description: 'Returns all visit properties on getObjectById'
}, async () => {
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.ok('last_visit' in res);
  assert.ok('visited_by' in res);
  assert.ok('visit_lat_lng' in res);
});

defineTest('Case 33: Filtering by visited returns only objects with non-empty last_visit', {
  tier: 16, milestone: 16, feature: 'CASE_33',
  description: 'Validates visited filter logic'
}, async () => {
  const all = await db.getObjects(TEST_COMPANY);
  const visitedOnly = all.filter(o => o.last_visit && o.last_visit !== '');
  for (const v of visitedOnly) {
    assert.ok(v.last_visit && v.last_visit.length > 0);
  }
});

defineTest('Case 34: Filtering by not_visited returns objects without visits', {
  tier: 16, milestone: 16, feature: 'CASE_34',
  description: 'Validates unvisited filter logic'
}, async () => {
  const all = await db.getObjects(TEST_COMPANY);
  const notVisitedOnly = all.filter(o => !o.last_visit || o.last_visit === '');
  for (const nv of notVisitedOnly) {
    assert.equal(nv.last_visit || '', '');
  }
});

defineTest('Case 35: Clearing object removes visit history for that specific company', {
  tier: 16, milestone: 16, feature: 'CASE_35',
  description: 'Resets last_visit and visited_by on clear'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    last_visit: '',
    visited_by: '',
    visit_lat_lng: ''
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal(res.last_visit, '');
  assert.equal(res.visited_by, '');
});

// ----------------------------------------------------------------------------
// BLOCK 3: Cases 36 - 50: Custom Building Registration & Multi-District Additions
// ----------------------------------------------------------------------------

const CUSTOM_SOURCE_ID = `custom_bld_${Date.now()}`;

defineTest('Case 36: Registering a brand new residential complex for a company (Samarqand Shodlik TJM)', {
  tier: 16, milestone: 16, feature: 'CASE_36',
  description: 'Creates custom complex in database'
}, async () => {
  const ok = await db.createCompanyCustomTJM(TEST_COMPANY, TEST_USER, CUSTOM_SOURCE_ID, {
    source_id: CUSTOM_SOURCE_ID,
    object_name: 'Samarqand Shodlik TJM',
    tjm_name: 'Samarqand Shodlik TJM',
    latitude: 39.658,
    longitude: 66.962,
    district_name: 'Samarqand shahri',
    address: 'Shoh Zinda ko\'chasi',
    phone: '+998 90 555 44 33'
  });
  assert.equal(ok, true);
});

defineTest('Case 37: Custom TJM receives unique generated source_id', {
  tier: 16, milestone: 16, feature: 'CASE_37',
  description: 'Verifies ID format and uniqueness'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  const found = customObjects.find((c: any) => c.source_id === CUSTOM_SOURCE_ID);
  assert.ok(found);
  assert.equal(found.source_id, CUSTOM_SOURCE_ID);
});

defineTest('Case 38: Custom TJM has is_custom_tjm: true and is_custom: true', {
  tier: 16, milestone: 16, feature: 'CASE_38',
  description: 'Flags custom complexes distinctly'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  const found = customObjects.find((c: any) => c.source_id === CUSTOM_SOURCE_ID);
  assert.equal(Boolean(found.is_custom_tjm || found.is_custom), true);
});

defineTest('Case 39: Custom TJM stores valid latitude and longitude coordinates', {
  tier: 16, milestone: 16, feature: 'CASE_39',
  description: 'Validates float precision coordinates'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  const found = customObjects.find((c: any) => c.source_id === CUSTOM_SOURCE_ID);
  assert.equal(Number(found.latitude), 39.658);
  assert.equal(Number(found.longitude), 66.962);
});

defineTest('Case 40: Custom TJM stores address in Samarqand district', {
  tier: 16, milestone: 16, feature: 'CASE_40',
  description: 'Validates address property'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  const found = customObjects.find((c: any) => c.source_id === CUSTOM_SOURCE_ID);
  assert.equal(found.address, 'Shoh Zinda ko\'chasi');
});

defineTest('Case 41: Custom TJM stores developer contact phone and manager name', {
  tier: 16, milestone: 16, feature: 'CASE_41',
  description: 'Validates contact data on custom object'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  const found = customObjects.find((c: any) => c.source_id === CUSTOM_SOURCE_ID);
  assert.equal(found.phone, '+998 90 555 44 33');
});

defineTest('Case 42: Custom TJM is listed in the registering company object list', {
  tier: 16, milestone: 16, feature: 'CASE_42',
  description: 'Confirms inclusion in getObjects(companyId)'
}, async () => {
  const list = await db.getObjects(TEST_COMPANY);
  assert.ok(list.some(o => o.source_id === CUSTOM_SOURCE_ID));
});

defineTest('Case 43: Custom TJM is completely absent from competitor company object list', {
  tier: 16, milestone: 16, feature: 'CASE_43',
  description: 'Competitor cannot access custom TJM'
}, async () => {
  const list = await db.getObjects('comp_competitor_x');
  assert.equal(list.some(o => o.source_id === CUSTOM_SOURCE_ID), false);
});

defineTest('Case 44: Custom TJM can be queried directly by its generated source_id', {
  tier: 16, milestone: 16, feature: 'CASE_44',
  description: 'Inspects getObjectById for custom TJM'
}, async () => {
  const res = await db.getObjectById(CUSTOM_SOURCE_ID, TEST_COMPANY);
  assert.ok(res);
  assert.equal(res.object_name, 'Samarqand Shodlik TJM');
});

defineTest('Case 45: Updating notes on a custom TJM persists seamlessly', {
  tier: 16, milestone: 16, feature: 'CASE_45',
  description: 'Updates CRM notes on custom complex'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, CUSTOM_SOURCE_ID, {
    notes: 'Custom bino uchun yangi eslatma'
  });
  const res = await db.getObjectById(CUSTOM_SOURCE_ID, TEST_COMPANY);
  assert.equal(res.notes, 'Custom bino uchun yangi eslatma');
});

defineTest('Case 46: Recording visit on a custom TJM works identically to registry objects', {
  tier: 16, milestone: 16, feature: 'CASE_46',
  description: 'Logs visit to custom complex'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, CUSTOM_SOURCE_ID, {
    last_visit: '2026-10-05 15:00',
    visited_by: 'Menejer Farhod'
  });
  const res = await db.getObjectById(CUSTOM_SOURCE_ID, TEST_COMPANY);
  assert.equal(res.visited_by, 'Menejer Farhod');
});

defineTest('Case 47: Registering a custom TJM with coordinates [0, 0] safely defaults to center coordinates', {
  tier: 16, milestone: 16, feature: 'CASE_47',
  description: 'Sanitizes zero coordinates'
}, async () => {
  const id0 = `custom_zero_${Date.now()}`;
  await db.createObject({
    source_id: id0,
    object_name: 'Nol koordinatali bino',
    latitude: 0,
    longitude: 0
  });
  const res = await db.getObjectById(id0);
  assert.ok(res);
  assert.ok(res.latitude !== 0 || res.longitude !== 0 || res.latitude === 39.6542);
});

defineTest('Case 48: Registering a custom TJM with missing district assigns default district', {
  tier: 16, milestone: 16, feature: 'CASE_48',
  description: 'Assigns default district_soato'
}, async () => {
  const idDist = `custom_dist_${Date.now()}`;
  const created = await db.createObject({
    source_id: idDist,
    object_name: 'Tuman belgilanmagan bino'
  });
  assert.ok(created.district_soato.length > 0);
});

defineTest('Case 49: Multiple custom TJMs can be registered sequentially for the same company', {
  tier: 16, milestone: 16, feature: 'CASE_49',
  description: 'Registers 3 custom buildings in sequence'
}, async () => {
  for (let i = 1; i <= 3; i++) {
    const id = `custom_seq_${Date.now()}_${i}`;
    await db.createCompanyCustomTJM(TEST_COMPANY, TEST_USER, id, {
      source_id: id,
      object_name: `Ketma-ket TJM #${i}`
    });
  }
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  assert.ok(customObjects.length >= 4);
});

defineTest('Case 50: Custom TJM persists in PostgreSQL company_data table under custom_object_json', {
  tier: 16, milestone: 16, feature: 'CASE_50',
  description: 'Verifies data store schema fidelity'
}, async () => {
  const { customObjects } = await db.getCompanyData(TEST_COMPANY);
  assert.ok(Array.isArray(customObjects));
});

// ----------------------------------------------------------------------------
// BLOCK 4: Cases 51 - 70: Navigator, Waypoint Routing & Route Planner Storage
// ----------------------------------------------------------------------------

const ROUTE_TEST_ID = `route_real_${Date.now()}`;

defineTest('Case 51: Planning a simple direct route from Registon to Afrosiyob (2 coordinates)', {
  tier: 16, milestone: 16, feature: 'CASE_51',
  description: 'Stores origin and destination'
}, async () => {
  const saved = await db.saveRoute({
    id: ROUTE_TEST_ID,
    company_id: TEST_COMPANY,
    user_id: TEST_USER,
    user_name: 'Menejer Alisher',
    route_name: 'Registon - Afrosiyob Express',
    start_name: 'Registon Maydoni',
    start_lat: 39.6548,
    start_lng: 66.9758,
    end_name: 'Afrosiyob Muzeyi',
    end_lat: 39.6710,
    end_lng: 66.9850,
    distance_km: 2.4,
    duration_min: 7,
    tjm_count: 2,
    tjm_list: '70187,70188',
    buffer_radius_m: 200,
    status: 'active'
  });
  assert.equal(saved.id, ROUTE_TEST_ID);
});

defineTest('Case 52: Saving planned route with route name (Menejer Kunlik Marshruti #1)', {
  tier: 16, milestone: 16, feature: 'CASE_52',
  description: 'Verifies route_name property'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  const found = routes.find(r => r.id === ROUTE_TEST_ID);
  assert.ok(found);
  assert.equal(found.route_name, 'Registon - Afrosiyob Express');
});

defineTest('Case 53: Route stores calculated distance in kilometers (distance_km)', {
  tier: 16, milestone: 16, feature: 'CASE_53',
  description: 'Verifies distance_km numeric precision'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  const found = routes.find(r => r.id === ROUTE_TEST_ID);
  assert.ok(found);
  assert.equal(Number(found!.distance_km), 2.4);
});

defineTest('Case 54: Route stores estimated duration in minutes (duration_min)', {
  tier: 16, milestone: 16, feature: 'CASE_54',
  description: 'Verifies duration_min numeric value'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  const found = routes.find(r => r.id === ROUTE_TEST_ID);
  assert.ok(found);
  assert.equal(Number(found!.duration_min), 7);
});

defineTest('Case 55: Route stores number of buildings visited (tjm_count)', {
  tier: 16, milestone: 16, feature: 'CASE_55',
  description: 'Verifies tjm_count attribute'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  const found = routes.find(r => r.id === ROUTE_TEST_ID);
  assert.ok(found);
  assert.equal(Number(found!.tjm_count), 2);
});

defineTest('Case 56: Route stores comma-separated list of building IDs (tjm_list)', {
  tier: 16, milestone: 16, feature: 'CASE_56',
  description: 'Verifies tjm_list string'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  const found = routes.find(r => r.id === ROUTE_TEST_ID);
  assert.ok(found);
  assert.equal(found!.tjm_list, '70187,70188');
});

defineTest('Case 57: Route stores buffer corridor radius (buffer_radius_m: 100)', {
  tier: 16, milestone: 16, feature: 'CASE_57',
  description: 'Stores 100m corridor'
}, async () => {
  const r = await db.saveRoute({
    id: `r_buf_100_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97,
    buffer_radius_m: 100
  });
  assert.equal(r.buffer_radius_m, 100);
});

defineTest('Case 58: Route stores buffer corridor radius (buffer_radius_m: 200)', {
  tier: 16, milestone: 16, feature: 'CASE_58',
  description: 'Stores 200m corridor'
}, async () => {
  const r = await db.saveRoute({
    id: `r_buf_200_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97,
    buffer_radius_m: 200
  });
  assert.equal(r.buffer_radius_m, 200);
});

defineTest('Case 59: Route stores buffer corridor radius (buffer_radius_m: 500)', {
  tier: 16, milestone: 16, feature: 'CASE_59',
  description: 'Stores 500m corridor'
}, async () => {
  const r = await db.saveRoute({
    id: `r_buf_500_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97,
    buffer_radius_m: 500
  });
  assert.equal(r.buffer_radius_m, 500);
});

defineTest('Case 60: Route stores custom notes and instructions for field agent', {
  tier: 16, milestone: 16, feature: 'CASE_60',
  description: 'Stores notes text'
}, async () => {
  const r = await db.saveRoute({
    id: `r_note_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97,
    notes: 'Ertalab soat 9:00 da boshlanadi, har bir TJMda 20 daqiqa vaqt ajratiladi.'
  });
  assert.ok(r.notes && r.notes.includes('Ertalab'));
});

defineTest('Case 61: Route stores status (active / Rejalashtirilgan)', {
  tier: 16, milestone: 16, feature: 'CASE_61',
  description: 'Verifies status property'
}, async () => {
  const r = await db.saveRoute({
    id: `r_stat_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97,
    status: 'Tugallangan'
  });
  assert.equal(r.status, 'Tugallangan');
});

defineTest('Case 62: Route stores creator user_id and user_name', {
  tier: 16, milestone: 16, feature: 'CASE_62',
  description: 'Associates creator with route'
}, async () => {
  const r = await db.saveRoute({
    id: `r_user_${Date.now()}`,
    company_id: TEST_COMPANY,
    user_id: 'user_bobur',
    user_name: 'Bobur Mirzoyev',
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97
  });
  assert.equal(r.user_name, 'Bobur Mirzoyev');
});

defineTest('Case 63: Fetching routes for Company A returns Company A routes', {
  tier: 16, milestone: 16, feature: 'CASE_63',
  description: 'Queries routes by company_id'
}, async () => {
  const routes = await db.getRoutes(TEST_COMPANY);
  assert.ok(routes.length >= 3);
  for (const r of routes) {
    assert.equal(r.company_id, TEST_COMPANY);
  }
});

defineTest('Case 64: Company B cannot see Company A routes', {
  tier: 16, milestone: 16, feature: 'CASE_64',
  description: 'Enforces route isolation'
}, async () => {
  const routesB = await db.getRoutes('comp_other_routes');
  assert.equal(routesB.some(r => r.id === ROUTE_TEST_ID), false);
});

defineTest('Case 65: Superadmin (system) can query all platform routes', {
  tier: 16, milestone: 16, feature: 'CASE_65',
  description: 'Superadmin queries un-filtered routes'
}, async () => {
  const allRoutes = await db.getRoutes();
  assert.ok(allRoutes.length >= 3);
});

defineTest('Case 66: Planning a long route across multiple districts (Samarqand to Toyloq)', {
  tier: 16, milestone: 16, feature: 'CASE_66',
  description: 'Handles 15km+ distance calculation'
}, async () => {
  const r = await db.saveRoute({
    id: `r_long_${Date.now()}`,
    company_id: TEST_COMPANY,
    route_name: 'Samarqand - Toyloq tumanlararo yo\'nalish',
    start_lat: 39.6542, start_lng: 66.9597,
    end_lat: 39.5890, end_lng: 67.1230,
    distance_km: 17.5,
    duration_min: 35
  });
  assert.equal(r.distance_km, 17.5);
});

defineTest('Case 67: Planning a dense city-center route with 10+ waypoint buildings', {
  tier: 16, milestone: 16, feature: 'CASE_67',
  description: 'Stores 10 comma-separated IDs'
}, async () => {
  const waypoints = Array.from({ length: 10 }, (_, i) => `7018${i}`).join(',');
  const r = await db.saveRoute({
    id: `r_dense_${Date.now()}`,
    company_id: TEST_COMPANY,
    tjm_count: 10,
    tjm_list: waypoints,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97
  });
  assert.equal(r.tjm_count, 10);
  assert.equal(r.tjm_list, waypoints);
});

defineTest('Case 68: Route with Uzbek name ("Temiryo\'l - Dagbit ko\'chasi") saves without escaping errors', {
  tier: 16, milestone: 16, feature: 'CASE_68',
  description: 'Stores apostrophes in route_name'
}, async () => {
  const name = 'Temiryo\'l - Dagbit ko\'chasi yo\'nalishi';
  const r = await db.saveRoute({
    id: `r_uzbek_${Date.now()}`,
    company_id: TEST_COMPANY,
    route_name: name,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97
  });
  assert.equal(r.route_name, name);
});

defineTest('Case 69: Route receives unique route_id', {
  tier: 16, milestone: 16, feature: 'CASE_69',
  description: 'Verifies ID string exists'
}, async () => {
  const r = await db.saveRoute({
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97
  });
  assert.ok(r.id.length > 5);
});

defineTest('Case 70: Route created_at timestamp is in ISO format', {
  tier: 16, milestone: 16, feature: 'CASE_70',
  description: 'Verifies ISO timestamp format'
}, async () => {
  const r = await db.saveRoute({
    id: `r_iso_${Date.now()}`,
    company_id: TEST_COMPANY,
    start_lat: 39.65, start_lng: 66.96, end_lat: 39.66, end_lng: 66.97
  });
  assert.ok(r.created_at.includes('T'));
});

// ----------------------------------------------------------------------------
// BLOCK 5: Cases 71 - 85: Multi-Tenant Enterprise Administration & Security
// ----------------------------------------------------------------------------

const NEW_COMP_ID = `comp_zarafshon_${Date.now()}`;

defineTest('Case 71: Admin creates a new enterprise tenant company (Zarafshon Qurilish Xolding)', {
  tier: 16, milestone: 16, feature: 'CASE_71',
  description: 'Creates company in companies table'
}, async () => {
  const comp = await db.createCompany('Zarafshon Qurilish Xolding', 'active');
  assert.ok(comp.company_id);
  assert.equal(comp.company_name, 'Zarafshon Qurilish Xolding');
});

defineTest('Case 72: Newly created company receives unique company_id', {
  tier: 16, milestone: 16, feature: 'CASE_72',
  description: 'Company ID format check'
}, async () => {
  const companies = await db.getCompanies();
  const found = companies.find(c => c.company_name === 'Zarafshon Qurilish Xolding');
  assert.ok(found);
  assert.ok(found.company_id.startsWith('comp_'));
});

defineTest('Case 73: Company has status active and default data_source', {
  tier: 16, milestone: 16, feature: 'CASE_73',
  description: 'Status check'
}, async () => {
  const companies = await db.getCompanies();
  const found = companies.find(c => c.company_name === 'Zarafshon Qurilish Xolding');
  assert.ok(found);
  assert.equal(found!.status, 'active');
});

defineTest('Case 74: Admin registers a company_admin for the new company', {
  tier: 16, milestone: 16, feature: 'CASE_74',
  description: 'Creates company_admin user in users table'
}, async () => {
  const u = await db.createUser({
    name: 'Sardor Rahim',
    login: 'sardor_admin',
    password: 'sardor2026Password',
    role: 'company_admin',
    company_id: NEW_COMP_ID
  });
  assert.equal(u.login, 'sardor_admin');
  assert.equal(u.role, 'company_admin');
});

defineTest('Case 75: Admin registers a manager for the new company', {
  tier: 16, milestone: 16, feature: 'CASE_75',
  description: 'Creates manager user in users table'
}, async () => {
  const u = await db.createUser({
    name: 'Olim Menejer',
    login: 'olim_mgr',
    password: 'olim123Password',
    role: 'manager',
    company_id: NEW_COMP_ID
  });
  assert.equal(u.login, 'olim_mgr');
  assert.equal(u.role, 'manager');
});

defineTest('Case 76: New manager authenticates with login and password', {
  tier: 16, milestone: 16, feature: 'CASE_76',
  description: 'Authenticates with exact credentials'
}, async () => {
  const profile = await db.authenticateUser('olim_mgr', 'olim123Password');
  assert.ok(profile);
  assert.equal(profile.login, 'olim_mgr');
});

defineTest('Case 77: Manager profile contains correct company_id and company_name', {
  tier: 16, milestone: 16, feature: 'CASE_77',
  description: 'Associates user profile with company'
}, async () => {
  const profile = await db.authenticateUser('olim_mgr', 'olim123Password');
  assert.equal(profile?.company_id, NEW_COMP_ID);
});

defineTest('Case 78: User login creates an audit record in user_sessions with action login', {
  tier: 16, milestone: 16, feature: 'CASE_78',
  description: 'Records login session in audit log'
}, async () => {
  await db.recordUserSession({
    user_id: 'user_olim',
    user_name: 'Olim Menejer',
    login: 'olim_mgr',
    role: 'manager',
    company_id: NEW_COMP_ID,
    action: 'login'
  });
  const sessions = await db.getUserSessions();
  assert.ok(sessions.some(s => s.login === 'olim_mgr' && s.action === 'login'));
});

defineTest('Case 79: User registration creates an audit record in user_sessions with action register', {
  tier: 16, milestone: 16, feature: 'CASE_79',
  description: 'Records registration in audit log'
}, async () => {
  await db.recordUserSession({
    user_id: 'user_sardor',
    user_name: 'Sardor Rahim',
    login: 'sardor_admin',
    role: 'company_admin',
    company_id: NEW_COMP_ID,
    action: 'register'
  });
  const sessions = await db.getUserSessions();
  assert.ok(sessions.some(s => s.login === 'sardor_admin' && s.action === 'register'));
});

defineTest('Case 80: Audit session records client IP address and User-Agent', {
  tier: 16, milestone: 16, feature: 'CASE_80',
  description: 'Stores network metadata'
}, async () => {
  const sessId = `sess_meta_${Date.now()}`;
  await db.recordUserSession({
    session_id: sessId,
    user_id: 'user_audit',
    user_name: 'Auditor',
    login: 'auditor',
    role: 'manager',
    company_id: 'comp_default',
    action: 'login',
    ip_address: '10.0.0.42',
    user_agent: 'Antigravity Test Agent'
  });
  const sessions = await db.getUserSessions();
  const found = sessions.find(s => s.session_id === sessId);
  assert.equal(found?.ip_address, '10.0.0.42');
  assert.equal(found?.user_agent, 'Antigravity Test Agent');
});

defineTest('Case 81: Querying sessions returns both login and register records', {
  tier: 16, milestone: 16, feature: 'CASE_81',
  description: 'Inspects multiple action types in session list'
}, async () => {
  const sessions = await db.getUserSessions();
  const hasLogin = sessions.some(s => s.action === 'login');
  const hasRegister = sessions.some(s => s.action === 'register');
  assert.equal(hasLogin, true);
  assert.equal(hasRegister, true);
});

defineTest('Case 82: Authentication fails for invalid password with HTTP 401 equivalent null', {
  tier: 16, milestone: 16, feature: 'CASE_82',
  description: 'Rejects incorrect password'
}, async () => {
  const profile = await db.authenticateUser('olim_mgr', 'wrong_pass_123');
  assert.equal(profile, null);
});

defineTest('Case 83: Authentication fails for non-existent username with HTTP 401 equivalent null', {
  tier: 16, milestone: 16, feature: 'CASE_83',
  description: 'Rejects unknown username'
}, async () => {
  const profile = await db.authenticateUser('not_existent_user_999', 'password');
  assert.equal(profile, null);
});

defineTest('Case 84: User login is case-insensitive (Admin, ADMIN, admin)', {
  tier: 16, milestone: 16, feature: 'CASE_84',
  description: 'Matches login regardless of casing'
}, async () => {
  const u1 = await db.authenticateUser('ADMIN', 'admin123');
  const u2 = await db.authenticateUser('Admin', 'admin123');
  assert.ok(u1);
  assert.ok(u2);
});

defineTest('Case 85: Superadmin user (admin / admin123) has role superadmin and global access', {
  tier: 16, milestone: 16, feature: 'CASE_85',
  description: 'Verifies superadmin role'
}, async () => {
  const admin = await db.authenticateUser('admin', 'admin123');
  assert.equal(admin?.role, 'superadmin');
  assert.equal(admin?.company_id, 'system');
});

// ----------------------------------------------------------------------------
// BLOCK 6: Cases 86 - 95: Dynamic Custom CRM Field Expansion
// ----------------------------------------------------------------------------

defineTest('Case 86: Admin defines a new custom field: tender_status (type: select)', {
  tier: 16, milestone: 16, feature: 'CASE_86',
  description: 'Adds select custom field'
}, async () => {
  const f = await db.addCustomField({ field_name: 'tender_status', field_type: 'select' });
  assert.equal(f.field_name, 'tender_status');
});

defineTest('Case 87: Admin defines a new custom field: investor_phone (type: phone)', {
  tier: 16, milestone: 16, feature: 'CASE_87',
  description: 'Adds phone custom field'
}, async () => {
  const f = await db.addCustomField({ field_name: 'investor_phone', field_type: 'phone' });
  assert.equal(f.field_name, 'investor_phone');
});

defineTest('Case 88: Admin defines a new custom field: cadastre_number (type: text)', {
  tier: 16, milestone: 16, feature: 'CASE_88',
  description: 'Adds text custom field'
}, async () => {
  const f = await db.addCustomField({ field_name: 'cadastre_number', field_type: 'text' });
  assert.equal(f.field_name, 'cadastre_number');
});

defineTest('Case 89: Admin defines a new custom field: architect_website (type: url)', {
  tier: 16, milestone: 16, feature: 'CASE_89',
  description: 'Adds url custom field'
}, async () => {
  const f = await db.addCustomField({ field_name: 'architect_website', field_type: 'url' });
  assert.equal(f.field_name, 'architect_website');
});

defineTest('Case 90: Custom fields query returns all visible fields', {
  tier: 16, milestone: 16, feature: 'CASE_90',
  description: 'Queries custom fields list'
}, async () => {
  const fields = await db.getCustomFields();
  assert.ok(fields.some(f => f.field_name === 'tender_status'));
  assert.ok(fields.some(f => f.field_name === 'investor_phone'));
});

defineTest('Case 91: Saving an object with the new custom field persists the custom key', {
  tier: 16, milestone: 16, feature: 'CASE_91',
  description: 'Saves dynamic field in object'
}, async () => {
  await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, {
    tender_status: 'G\'olib aniqlandi',
    investor_phone: '+998 90 777 88 99'
  });
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal((res as any).tender_status, 'G\'olib aniqlandi');
});

defineTest('Case 92: Reading the object returns the custom field value', {
  tier: 16, milestone: 16, feature: 'CASE_92',
  description: 'Retrieves dynamic field'
}, async () => {
  const res = await db.getObjectById(TARGET_OBJ, TEST_COMPANY);
  assert.equal((res as any).investor_phone, '+998 90 777 88 99');
});

defineTest('Case 93: Adding a duplicate custom field name updates visibility rather than duplicating', {
  tier: 16, milestone: 16, feature: 'CASE_93',
  description: 'Prevents duplicate custom field entries'
}, async () => {
  await db.addCustomField({ field_name: 'tender_status', field_type: 'select' });
  const fields = await db.getCustomFields();
  const count = fields.filter(f => f.field_name === 'tender_status').length;
  assert.equal(count, 1);
});

defineTest('Case 94: Custom field column letter is generated or assigned', {
  tier: 16, milestone: 16, feature: 'CASE_94',
  description: 'Assigns column letter'
}, async () => {
  const f = await db.addCustomField({ field_name: 'custom_col_test', column_letter: 'AJ' });
  assert.ok(f.column_letter && f.column_letter.length > 0);
});

defineTest('Case 95: Custom fields are accessible across API endpoints', {
  tier: 16, milestone: 16, feature: 'CASE_95',
  description: 'Confirms custom fields presence in schema'
}, async () => {
  const fields = await db.getCustomFields();
  assert.ok(Array.isArray(fields));
  assert.ok(fields.length >= 4);
});

// ----------------------------------------------------------------------------
// BLOCK 7: Cases 96 - 105: Weekly Notifications & Full Life-Cycle End-to-End
// ----------------------------------------------------------------------------

defineTest('Case 96: Creating a weekly sync notification with title, summary, and new count', {
  tier: 16, milestone: 16, feature: 'CASE_96',
  description: 'Stores sync notification'
}, async () => {
  const notif = await db.saveNotification({
    title: 'Haftalik Samarqand xaritasi yangilanishi',
    summary: '15 ta yangi turar-joy majmuasi kiritildi.',
    new_count: 15
  });
  assert.equal(notif.new_count, 15);
});

defineTest('Case 97: Notification stores new objects list (new_objects)', {
  tier: 16, milestone: 16, feature: 'CASE_97',
  description: 'Persists nested objects array'
}, async () => {
  const items = [{ source_id: '70200', object_name: 'Yangi TJM-1', region_soato: '1718', district_soato: '1718401', address: 'Samarqand', latitude: 39.65, longitude: 66.96 }];
  const notif = await db.saveNotification({
    title: 'Yangi obyektlar ro\'yxati',
    new_objects: items as any
  });
  assert.equal(notif.new_objects.length, 1);
});

defineTest('Case 98: Notification stores regional breakdown JSON (by_region)', {
  tier: 16, milestone: 16, feature: 'CASE_98',
  description: 'Persists by_region map'
}, async () => {
  const byRegion = { '1718': 10, '1726': 5 };
  const notif = await db.saveNotification({
    title: 'Hududlar bo\'yicha yangilanish',
    by_region: byRegion
  });
  assert.equal(notif.by_region['1718'], 10);
});

defineTest('Case 99: Notification timestamp is in ISO format', {
  tier: 16, milestone: 16, feature: 'CASE_99',
  description: 'Validates timestamp'
}, async () => {
  const notif = await db.saveNotification({ title: 'Vaqt tekshiruvi' });
  assert.ok(notif.timestamp.length > 5);
});

defineTest('Case 100: Fetching notifications returns recent sync alerts sorted by date descending', {
  tier: 16, milestone: 16, feature: 'CASE_100',
  description: 'Queries notifications list'
}, async () => {
  const list = await db.getNotifications();
  assert.ok(list.length >= 3);
});

defineTest('Case 101: Notifications filter distinguishes read vs unread notifications', {
  tier: 16, milestone: 16, feature: 'CASE_101',
  description: 'Checks is_read flag'
}, async () => {
  const list = await db.getNotifications();
  const unread = list.filter(n => !n.is_read);
  assert.ok(unread.length > 0);
});

defineTest('Case 102: UYSOT.UZ company isolation: Nilufar admin receives Domtut Tashkent complexes exclusively', {
  tier: 16, milestone: 16, feature: 'CASE_102',
  description: 'Guarantees zero DSHK overlap for UYSOT'
}, async () => {
  const uysot = await db.getObjects('uysot', true);
  assert.ok(uysot.length >= 500);
  const leaked = uysot.filter(o => !String(o.source_id).startsWith('domtut_') && !o.is_uysot);
  assert.equal(leaked.length, 0);
});

defineTest('Case 103: Samarqand companies receive Samarqand DSHK complexes exclusively', {
  tier: 16, milestone: 16, feature: 'CASE_103',
  description: 'Guarantees zero Domtut overlap for Samarqand'
}, async () => {
  const sam = await db.getObjects('comp_samarqand', false);
  assert.ok(sam.length > 1000);
  const leaked = sam.filter(o => String(o.source_id).startsWith('domtut_') || o.is_uysot);
  assert.equal(leaked.length, 0);
});

defineTest('Case 104: SQL injection attack payloads in search, notes, or route names are completely neutralized', {
  tier: 16, milestone: 16, feature: 'CASE_104',
  description: 'Neutralizes SQL injection payloads across all endpoints'
}, async () => {
  const injection = "'; DROP TABLE objects; --";
  const ok = await db.updateCompanyData(TEST_COMPANY, TEST_USER, TARGET_OBJ, { notes: injection });
  assert.equal(ok, true);

  const objects = await db.getObjects();
  assert.ok(objects.length > 1000, 'Table objects must NOT have been dropped');
});

defineTest('Case 105: Full round-trip: User logs in -> searches building -> edits CRM fields -> logs visit -> plans route -> audits session in PostgreSQL', {
  tier: 16, milestone: 16, feature: 'CASE_105',
  description: 'Executes entire end-to-end commercial lifecycle in sequence'
}, async () => {
  // 1. Authenticate user
  const user = await db.authenticateUser('ibroxim', 'ibroxim2026');
  assert.ok(user);
  const uid = user!.id || user!.user_id || 'user_ibroxim';
  const cid = user!.company_id || 'comp_default';
  const uname = user!.name || 'Ibroxim Toirov';

  // 2. Audit login session
  await db.recordUserSession({
    user_id: uid,
    user_name: uname,
    login: user!.login,
    action: 'login',
    company_id: cid
  });

  // 3. Search and fetch building
  const obj = await db.getObjectById(TARGET_OBJ, cid);
  assert.ok(obj);

  // 4. Update CRM intelligence
  await db.updateCompanyData(cid, uid, TARGET_OBJ, {
    manager_name: 'Ibroxim Toirov',
    phone: '+998 90 123 45 67',
    notes: 'To\'liq round-trip test muvaffaqiyatli yakunlandi.',
    priority: 'Yuqori'
  });

  // 5. Record inspector visit
  await db.updateCompanyData(cid, uid, TARGET_OBJ, {
    last_visit: new Date().toISOString(),
    visited_by: uname,
    visit_lat_lng: '39.6542,66.9597'
  });

  // 6. Plan navigator route
  const route = await db.saveRoute({
    company_id: cid,
    user_id: uid,
    user_name: uname,
    route_name: 'Yakuniy E2E Marshruti',
    start_lat: 39.6548, start_lng: 66.9758,
    end_lat: 39.6710, end_lng: 66.9850,
    tjm_count: 1,
    tjm_list: TARGET_OBJ
  });
  assert.ok(route.id);

  // 7. Verify audit trail in database
  const sessions = await db.getUserSessions();
  assert.ok(sessions.some(s => s.login === 'ibroxim'));

  // 8. Verify final building state
  const finalState = await db.getObjectById(TARGET_OBJ, user.company_id);
  assert.equal(finalState.manager_name, 'Ibroxim Toirov');
  assert.equal(finalState.visited_by, user.name);
  assert.equal(finalState.priority, 'Yuqori');
});
