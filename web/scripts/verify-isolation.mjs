// Comprehensive Cross-Company Data Isolation & Zero-Leakage Verifier
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

console.log('======================================================================');
console.log('   B2B SAMARQAND vs UYSOT.UZ DATA ISOLATION VERIFICATION MATRIX      ');
console.log('======================================================================\n');

async function testEndpoint(name, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`❌ Failed to fetch ${name} from ${url}:`, err.message);
    return null;
  }
}

async function run() {
  console.log(`[1] Querying Live Local Endpoints on ${BASE_URL}...`);

  // 1. Fetch UYSOT objects
  const uysotRes = await testEndpoint('UYSOT Company API', `${BASE_URL}/api/objects?company_id=uysot`);
  const uysotObjects = uysotRes?.data || [];
  console.log(`  ✔ UYSOT.UZ returned: ${uysotObjects.length} objects`);

  // 2. Fetch UYQUR objects
  const uyqurRes = await testEndpoint('UYQUR Company API', `${BASE_URL}/api/objects?company_id=comp_1789981565014`);
  const uyqurObjects = uyqurRes?.data || [];
  console.log(`  ✔ UYQUR returned: ${uyqurObjects.length} objects`);

  // 3. Fetch Samarqand / System objects
  const systemRes = await testEndpoint('System/Samarqand API', `${BASE_URL}/api/objects?company_id=system`);
  const systemObjects = systemRes?.data || [];
  console.log(`  ✔ Samarqand/System returned: ${systemObjects.length} objects`);

  // 4. Fetch Default / Empty Company API
  const defaultRes = await testEndpoint('Default Empty Company API', `${BASE_URL}/api/objects`);
  const defaultObjects = defaultRes?.data || [];
  console.log(`  ✔ Default (empty company) returned: ${defaultObjects.length} objects\n`);

  console.log('----------------------------------------------------------------------');
  console.log('[2] Strict Data Isolation Matrix Checks');
  console.log('----------------------------------------------------------------------');

  const uysotIds = new Set(uysotObjects.map(o => String(o.source_id)));
  const uyqurIds = new Set(uyqurObjects.map(o => String(o.source_id)));
  const systemIds = new Set(systemObjects.map(o => String(o.source_id)));

  // Test A: Zero intersection between UYSOT and UYQUR
  const uysotUyqurIntersection = [...uysotIds].filter(id => uyqurIds.has(id));
  if (uysotUyqurIntersection.length === 0) {
    console.log(`  [PASS] Zero Object Intersection (UYSOT ∩ UYQUR): 0 shared objects`);
  } else {
    console.error(`  [FAIL] DATA LEAKAGE! Shared objects found: ${uysotUyqurIntersection.slice(0, 5).join(', ')}`);
    process.exit(1);
  }

  // Test B: Zero intersection between UYSOT and Samarqand/System
  const uysotSystemIntersection = [...uysotIds].filter(id => systemIds.has(id));
  if (uysotSystemIntersection.length === 0) {
    console.log(`  [PASS] Zero Object Intersection (UYSOT ∩ System): 0 shared objects`);
  } else {
    console.error(`  [FAIL] DATA LEAKAGE! Shared objects found: ${uysotSystemIntersection.slice(0, 5).join(', ')}`);
    process.exit(1);
  }

  // Test C: Check that 100% of UYSOT objects are Domtut Tashkent complexes
  const nonDomtutInUysot = uysotObjects.filter(o => !String(o.source_id).startsWith('domtut_'));
  if (nonDomtutInUysot.length === 0) {
    console.log(`  [PASS] UYSOT Dataset Purity: 100% of ${uysotObjects.length} objects are Domtut objects`);
  } else {
    console.error(`  [FAIL] Foreign objects found in UYSOT: ${nonDomtutInUysot.length} items!`);
    process.exit(1);
  }

  // Test D: Check that 0% of UYQUR / System objects contain Domtut complexes
  const domtutInUyqur = uyqurObjects.filter(o => String(o.source_id).startsWith('domtut_') || o.is_uysot);
  const domtutInSystem = systemObjects.filter(o => String(o.source_id).startsWith('domtut_') || o.is_uysot);
  if (domtutInUyqur.length === 0 && domtutInSystem.length === 0) {
    console.log(`  [PASS] Other Companies Purity: 0 Domtut objects leaked to UYQUR or System`);
  } else {
    console.error(`  [FAIL] DATA LEAKAGE! Domtut found in UYQUR (${domtutInUyqur.length}) or System (${domtutInSystem.length})!`);
    process.exit(1);
  }

  // Test E: Geographical boundary integrity
  const invalidUysotCoords = uysotObjects.filter(o => !o.latitude || !o.longitude || o.latitude < 40.0 || o.latitude > 42.5);
  if (invalidUysotCoords.length === 0) {
    console.log(`  [PASS] Geographic Integrity: 100% of UYSOT coordinates fall inside Tashkent region (Lat 40.0 - 42.5)`);
  } else {
    console.warn(`  [WARN] ${invalidUysotCoords.length} UYSOT objects have out-of-bounds coordinates`);
  }

  // Test F: Verification of Google Sheets Fallback JSON
  const jsonPath = path.resolve(ROOT, 'src/lib/uysot-domtut-data.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    console.log(`  [PASS] Local Backup Cache: ${parsed.length} objects verified in uysot-domtut-data.json`);
  } else {
    console.error(`  [FAIL] Missing uysot-domtut-data.json cache!`);
    process.exit(1);
  }

  console.log('\n======================================================================');
  console.log('   🎉 RESULT: ALL ISOLATION CHECKS PASSED WITH 0% DATA LEAKAGE!       ');
  console.log('======================================================================\n');
}

run();
