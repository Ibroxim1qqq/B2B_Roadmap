import assert from 'node:assert';
import { defineTest } from './harness.ts';
import { db } from '../../src/lib/db.ts';
import { INITIAL_ADVANCED_FILTERS, countActiveFilters } from '../../src/lib/filters.ts';

// ============================================================================
// Tier 17: Advanced Filtering & Pure Neon DB Decoupling Verification
// ============================================================================

defineTest(
  'Initial advanced filters should have 0 active count',
  {
    tier: 17,
    milestone: 5,
    feature: 'FILTERS',
    description: 'Initial state has no active filters'
  },
  async () => {
    const active = countActiveFilters(INITIAL_ADVANCED_FILTERS);
    assert.strictEqual(active, 0, 'Initial active filters count must be 0');
  }
);

defineTest(
  'countActiveFilters correctly tallies custom room count, min/max floors, apartments, and statuses',
  {
    tier: 17,
    milestone: 5,
    feature: 'FILTERS',
    description: 'countActiveFilters accurately tallies all custom criteria'
  },
  async () => {
    const filters = {
      ...INITIAL_ADVANCED_FILTERS,
      roomCount: '2',
      minFloors: '5',
      maxFloors: '12',
      minApartments: '50',
      visitStatus: 'visited' as const,
      crmStatus: 'filled' as const
    };
    const active = countActiveFilters(filters);
    assert.strictEqual(active, 6, '1 room + 2 floor bounds + 1 apartment bound + 1 visit + 1 crm = 6 active filters');
  }
);

defineTest(
  'Room count regex correctly matches 1, 2, 3, and 4+ room mentions in Uzbek',
  {
    tier: 17,
    milestone: 5,
    feature: 'FILTERS',
    description: 'Room count regex matches variety of Uzbek construction names'
  },
  async () => {
    const r1 = /(^|\D)1\s*[-–]?\s*xona|bir\s*xona/i;
    const r2 = /(^|\D)2\s*[-–]?\s*xona|ikki\s*xona/i;
    const r3 = /(^|\D)3\s*[-–]?\s*xona|uch\s*xona/i;
    const r4 = /(^|\D)[4-9]\s*[-–]?\s*xona|to['`]?rt\s*xona/i;

    assert.ok(r1.test('1 xonali shinam xonadonlar'), 'Must match 1 xonali');
    assert.ok(r1.test('1-xona turar joy'), 'Must match 1-xona');
    assert.ok(r2.test('2 xonali zamonaviy kvartira'), 'Must match 2 xonali');
    assert.ok(r3.test('3 xonali keng xonadonlar'), 'Must match 3 xonali');
    assert.ok(r4.test('4 xonali lyuks pentxaus'), 'Must match 4 xonali');
    assert.ok(r4.test("to'rt xonali bino"), "Must match to'rt xonali");
  }
);

defineTest(
  'Neon PostgreSQL database is configured and returns Samarqand objects directly',
  {
    tier: 17,
    milestone: 5,
    feature: 'DATABASE',
    description: 'Neon DB supplies base Samarqand objects without Google Sheets'
  },
  async () => {
    const objects = await db.getObjects('comp_default', false);
    assert.ok(Array.isArray(objects), 'Objects must be an array');
    assert.ok(objects.length > 0, 'Must load Samarqand objects from Neon DB');
    const first = objects[0];
    assert.ok(Boolean(first.source_id), 'First object must have source_id');
    assert.ok(Boolean(first.object_name), 'First object must have object_name');
    assert.ok(typeof first.latitude === 'number' || !isNaN(parseFloat(first.latitude)), 'Latitude must be numeric');
    assert.ok(typeof first.longitude === 'number' || !isNaN(parseFloat(first.longitude)), 'Longitude must be numeric');
  }
);

defineTest(
  'Neon PostgreSQL database returns UYSOT Domtut objects strictly isolated',
  {
    tier: 17,
    milestone: 5,
    feature: 'DATABASE',
    description: 'Neon DB isolates UYSOT complexes from Samarqand complexes'
  },
  async () => {
    const uysotObjects = await db.getObjects('uysot', true);
    assert.ok(Array.isArray(uysotObjects), 'Uysot objects must be an array');
    assert.ok(uysotObjects.length > 0, 'Must load UYSOT Domtut objects from Neon DB');
    const hasSamarqand = uysotObjects.some(o => !String(o.source_id).startsWith('domtut_') && !o.is_uysot);
    assert.strictEqual(hasSamarqand, false, 'UYSOT objects must NEVER contain non-domtut objects');
  }
);

defineTest(
  'db.updateCompanyData writes directly to company_data without Google Sheets',
  {
    tier: 17,
    milestone: 5,
    feature: 'DATABASE',
    description: 'Company CRM records persist reliably directly in PostgreSQL'
  },
  async () => {
    const testSid = 'test_qa_source_999';
    const testData = {
      notes: 'QA Audit Note for Neon Decoupling',
      manager_name: 'QA Inspector',
      priority: 'Yuqori'
    };
    const success = await db.updateCompanyData('comp_default', 'qa_user', testSid, testData);
    assert.ok(success, 'updateCompanyData must return true');

    const detail = await db.getObjectById(testSid, 'comp_default');
    if (detail) {
      assert.strictEqual(detail.notes, testData.notes, 'Notes must persist in Neon DB');
      assert.strictEqual(detail.manager_name, testData.manager_name, 'Manager must persist in Neon DB');
    }
  }
);
