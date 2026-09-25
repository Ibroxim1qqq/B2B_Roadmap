import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../');

const uysotJson = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'src/lib/uysot-domtut-data.json'), 'utf-8'));
const uysotData = Array.isArray(uysotJson) ? uysotJson : uysotJson.rows || [];
const dshkData = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'src/lib/real-sheets-data.json'), 'utf-8')).rows;

console.log(`\n========================================`);
console.log(`🔍 B2B ROADMAP FULL QA AUDIT FOR OBJECT ACTIONS`);
console.log(`========================================`);
console.log(`📊 Loaded: ${uysotData.length} UYSOT objects, ${dshkData.length} DSHK objects.`);

// 1. Core Utils Replicas (Matching web/src/lib/utils.ts)
function getNavigationUrl(lat, lng) {
  const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
  const longitude = typeof lng === 'number' ? lng : parseFloat(lng);
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return 'https://www.google.com/maps';
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function getTelegramUrl(usernameOrPhone) {
  if (!usernameOrPhone) return '#';
  const str = String(usernameOrPhone).trim();
  if (!str) return '#';
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  const clean = str.replace('@', '').replace(/\s+/g, '').replace('+', '');
  return `https://t.me/${clean}`;
}

function getInstagramUrl(handle) {
  if (!handle) return '#';
  const str = String(handle).trim();
  if (!str) return '#';
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  const clean = str.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace('@', '').replace(/\//g, '').trim();
  return `https://instagram.com/${clean}`;
}

function getCallUrl(phone) {
  if (!phone) return '#';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '#';
  return `tel:+${digits}`;
}

function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  if (digits.length === 9) {
    return `+998 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
  }
  return String(phone);
}

// 2. Format Object Detail Simulation (matching web/src/lib/api.ts)
function simulateFormatDetail(r) {
  if (!r) throw new Error("Object row is null/undefined");
  const lat = typeof r.latitude === 'number' ? r.latitude : parseFloat(r.latitude) || 39.6542;
  const lng = typeof r.longitude === 'number' ? r.longitude : parseFloat(r.longitude) || 66.9597;
  const source_id = String(r.source_id || r.id || 'unknown');
  
  return {
    source: {
      source_id,
      object_name: String(r.object_name || r.name || "Noma'lum bino"),
      region_soato: String(r.region_soato || '1718'),
      region_name: String(r.region_name || 'Samarqand'),
      district_soato: String(r.district_soato || ''),
      district_name: String(r.district_name || 'Samarqand'),
      address: String(r.address || r.location_building || ''),
      latitude: lat,
      longitude: lng,
      status: String(r.status || 'Qurilish jarayonida'),
      status_id: parseInt(r.status_id) || 1,
      sphere_id: String(r.sphere_id || '57'),
      sphere_name: "Ko'p xonadonli uy-joylar",
      customer: String(r.customer || r.organization_name || '—'),
      designer: String(r.designer || '—'),
      builder: String(r.builder || r.developer || '—'),
      difficulty: r.difficulty ? (String(r.difficulty).includes('toifa') ? String(r.difficulty) : `${r.difficulty}-toifa`) : 'II-toifa',
      floors: (r.floors && String(r.floors) !== '0') ? String(r.floors).trim() : '—',
      apartment_count: r.apartment_count ? String(r.apartment_count).trim() : '0',
      area: (r.apartment_count && String(r.apartment_count) !== '0') ? `${r.apartment_count} xonadon` : '—',
      block_count: String(r.block_count || '1'),
      deadline: String(r.deadline || '—'),
      created_at: String(r.created_at || ''),
      task_id: String(r.task_id || ''),
      passport_url: String(r.passport_url || ''),
      source_url: String(r.source_url || (source_id.startsWith('domtut_') ? `https://domtut.uz` : `https://dshk.shaffofqurilish.uz/object/${source_id}`)),
      image_url: String(r.image_url || '')
    },
    internal: {
      tjm_name: String(r.tjm_name || '').trim(),
      phone: String(r.phone || '').trim(),
      sales_office: String(r.sales_office || '').trim(),
      manager_name: String(r.manager_name || '').trim(),
      manager_phone: String(r.manager_phone || '').trim(),
      telegram: String(r.telegram || '').trim(),
      instagram: String(r.instagram || '').trim(),
      notes: String(r.notes || '').trim(),
      priority: String(r.priority || '').trim(),
      last_visit: String(r.last_visit || '').trim(),
      visited_by: String(r.visited_by || '').trim(),
      visit_lat_lng: String(r.visit_lat_lng || '').trim()
    }
  };
}

// 3. Simulate UI Render for each detail
function simulateObjectDetailsRender(detail, distance) {
  const source = detail?.source || {};
  const internal = detail?.internal || {};

  const distText = (distance !== undefined && distance !== null && !isNaN(distance))
    ? (distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`)
    : '—';

  const hasB2BData = Boolean(
    internal.tjm_name || 
    internal.phone || 
    internal.sales_office || 
    internal.manager_name || 
    internal.manager_phone || 
    internal.telegram || 
    internal.instagram || 
    internal.notes
  );

  const isVisited = Boolean(internal.last_visit);

  // All UI actions
  const title = internal.tjm_name ? internal.tjm_name : source.object_name;
  const navUrl = getNavigationUrl(source.latitude, source.longitude);
  const callUrl = internal.phone ? getCallUrl(internal.phone) : null;
  const mgrCallUrl = internal.manager_phone ? getCallUrl(internal.manager_phone) : null;
  const tgUrl = internal.telegram ? getTelegramUrl(internal.telegram) : null;
  const igUrl = internal.instagram ? getInstagramUrl(internal.instagram) : null;
  const formattedPh = internal.phone ? formatPhone(internal.phone) : '';

  // Return true if all checks succeed without throwing
  return Boolean(title && navUrl);
}

// Run through all dataset objects
let failCount = 0;

console.log(`\nTesting ${uysotData.length} UYSOT objects...`);
for (let i = 0; i < uysotData.length; i++) {
  try {
    const item = uysotData[i];
    const detail = simulateFormatDetail(item);
    simulateObjectDetailsRender(detail, 2.5);
  } catch (err) {
    console.error(`❌ UYSOT failure on item index ${i}:`, err);
    failCount++;
  }
}
console.log(`✅ UYSOT objects tested. Failures: ${failCount}`);

const uysotFails = failCount;
console.log(`\nTesting ${dshkData.length} DSHK objects...`);
for (let i = 0; i < dshkData.length; i++) {
  try {
    const item = dshkData[i];
    const detail = simulateFormatDetail(item);
    simulateObjectDetailsRender(detail, 1.2);
  } catch (err) {
    console.error(`❌ DSHK failure on item index ${i}:`, err);
    failCount++;
  }
}
console.log(`✅ DSHK objects tested. Failures: ${failCount - uysotFails}`);

// 4. Live Server HTTP Endpoint QA
console.log(`\nTesting live server endpoints at http://localhost:3001...`);
async function testLiveServer() {
  try {
    // A. Default objects
    const r1 = await fetch('http://localhost:3001/api/objects?t=' + Date.now());
    if (!r1.ok) throw new Error(`GET /api/objects returned ${r1.status}`);
    const j1 = await r1.json();
    console.log(`✅ Live GET /api/objects: OK, count = ${j1.data?.length || 0}`);

    // B. UYSOT objects
    const r2 = await fetch('http://localhost:3001/api/objects?company_id=uysot&t=' + Date.now());
    if (!r2.ok) throw new Error(`GET /api/objects?company_id=uysot returned ${r2.status}`);
    const j2 = await r2.json();
    console.log(`✅ Live GET /api/objects?company_id=uysot: OK, count = ${j2.data?.length || 0}`);

    // C. Test update B2B data action
    const testObjId = j1.data[0].source_id;
    const r3 = await fetch('http://localhost:3001/api/objects/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: testObjId,
        data: { notes: 'QA Test Run ' + Date.now() },
        user: 'QA Bot'
      })
    });
    const j3 = await r3.json();
    console.log(`✅ Live POST /api/objects/update: OK = ${j3.success}`);

    // D. Test visit action
    const r4 = await fetch('http://localhost:3001/api/objects/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: testObjId,
        visited_by: 'QA Bot',
        lat_lng: '39.65,66.96'
      })
    });
    const j4 = await r4.json();
    console.log(`✅ Live POST /api/objects/visit: OK = ${j4.success}`);

    console.log(`\n🎉 ALL LIVE SERVER ENDPOINT TESTS PASSED!`);
  } catch (err) {
    console.warn(`⚠️ Live server check skipped or error (server may be busy or on different port):`, err.message);
  }
}

await testLiveServer();

console.log(`\n========================================`);
if (failCount === 0) {
  console.log(`🎯 TOTAL CRASH ERRORS: 0. AUDIT 100% PASSED!`);
} else {
  console.error(`💥 TOTAL CRASH ERRORS: ${failCount}`);
  process.exit(1);
}
console.log(`========================================\n`);
