// Adds new DSHK objects to Neon and refreshes source columns of existing ones.
// Company CRM data lives in company_data, which this script never touches.
//   node scripts/sync-dshk-to-neon.mjs [--dry-run]
import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl, describeDatabase } from './_db-env.mjs';

const REGION_NAMES = {
  '1703': 'Andijon viloyati',
  '1706': 'Buxoro viloyati',
  '1708': 'Jizzax viloyati',
  '1710': 'Qashqadaryo viloyati',
  '1712': 'Navoiy viloyati',
  '1714': 'Namangan viloyati',
  '1718': 'Samarqand viloyati',
  '1722': 'Surxondaryo viloyati',
  '1724': 'Sirdaryo viloyati',
  '1726': 'Toshkent shahri',
  '1727': 'Toshkent viloyati',
  '1730': "Farg'ona viloyati",
  '1733': 'Xorazm viloyati',
  '1735': "Qoraqalpog'iston Respublikasi"
};

const dryRun = process.argv.includes('--dry-run');

function getRegionName(soato) {
  return REGION_NAMES[String(soato || '').substring(0, 4)] || "Noma'lum hudud";
}

function formatDifficulty(value) {
  if (!value) return 'II-toifa';
  const num = parseInt(value);
  if (num === 1) return 'I-toifa';
  if (num === 2) return 'II-toifa';
  if (num === 3) return 'III-toifa';
  if (num === 4) return 'IV-toifa';
  return `${value}-toifa`;
}

function parseItem(item) {
  let parsed = {};
  if (item.object_json) {
    try {
      parsed = typeof item.object_json === 'string' ? JSON.parse(item.object_json) : item.object_json;
    } catch {
      parsed = {};
    }
  }
  const regionSoato = String(parsed.region_soato || item.region_soato || '1718');
  const regionName = getRegionName(regionSoato);
  return {
    source_id: String(item.object_id),
    object_name: String(parsed.name || item.name || "Ko'p xonadonli turar-joy binosi").trim(),
    region_soato: regionSoato,
    region_name: regionName,
    district_soato: String(parsed.district_soato || item.district_soato || ''),
    district_name: '',
    address: String(parsed.location_building || item.address || regionName).trim(),
    latitude: parseFloat(parsed.lat || item.lat) || 0,
    longitude: parseFloat(parsed.long || item.long) || 0,
    floors: String(item.max_floor || parsed.floors || '—'),
    apartment_count: String(item.apartment_count || parsed.apartment_count || '0'),
    block_count: String(item.block_count || parsed.block_count || '1'),
    deadline: String(parsed.deadline || item.dedline || '—'),
    customer: String(parsed.organization_name || item.customer || '—').trim(),
    difficulty: formatDifficulty(parsed.difficulty),
    task_id: String(parsed.task_id || ''),
    created_at: item.created_at || new Date().toISOString()
  };
}

async function fetchDshkItems() {
  const response = await fetch('https://api-dshk.shaffofqurilish.uz/api/list-construction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sphere_id: 57, status: 2 }),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`DSHK API xatosi: ${response.status}`);
  const result = await response.json();
  return Array.isArray(result.data) ? result.data : [];
}

async function run() {
  const url = resolveDatabaseUrl();
  console.log(`Baza: ${describeDatabase(url)}${dryRun ? ' (dry-run, hech narsa yozilmaydi)' : ''}`);
  const sql = neon(url);

  const apiItems = await fetchDshkItems();
  console.log(`DSHK API: ${apiItems.length} ta obyekt`);
  // An empty answer means the source is down, not that every object disappeared.
  if (apiItems.length === 0) throw new Error("DSHK API bo'sh javob qaytardi, sinxronizatsiya to'xtatildi");

  const parsed = apiItems.filter(item => item.object_id).map(parseItem);
  const withoutCoords = parsed.filter(o => !o.latitude || !o.longitude);
  const valid = parsed.filter(o => o.latitude && o.longitude);
  if (withoutCoords.length > 0) {
    console.warn(`Koordinatasiz ${withoutCoords.length} ta obyekt o'tkazib yuborildi: ${withoutCoords.slice(0, 10).map(o => o.source_id).join(', ')}`);
  }

  const existingRows = await sql`SELECT source_id FROM objects`;
  const existing = new Set(existingRows.map(r => String(r.source_id)));
  const newObjects = valid.filter(o => !existing.has(o.source_id));
  console.log(`Mavjud: ${existing.size}, yangi: ${newObjects.length}, yangilanadi: ${valid.length - newObjects.length}`);

  if (dryRun) return;

  const batchSize = 200;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = JSON.stringify(valid.slice(i, i + batchSize));
    await sql`
      INSERT INTO objects (
        source_id, object_name, region_soato, region_name, district_soato, district_name, address,
        latitude, longitude, status, status_id, sphere_id, sphere_name, customer, designer, builder,
        difficulty, floors, apartment_count, block_count, deadline, created_at, task_id, is_uysot, updated_at
      )
      SELECT
        source_id, object_name, region_soato, region_name, district_soato, district_name, address,
        latitude, longitude, 'Qurilish jarayonida', 1, '57', 'Ko''p xonadonli uy-joylar', customer, '—', '—',
        difficulty, floors, apartment_count, block_count, deadline, created_at, task_id, false, NOW()
      FROM jsonb_to_recordset(${batch}::jsonb) AS x(
        source_id text, object_name text, region_soato text, region_name text, district_soato text,
        district_name text, address text, latitude numeric, longitude numeric, customer text, difficulty text,
        floors text, apartment_count text, block_count text, deadline text, created_at text, task_id text
      )
      ON CONFLICT (source_id) DO UPDATE SET
        object_name = EXCLUDED.object_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        floors = CASE WHEN EXCLUDED.floors = '—' THEN objects.floors ELSE EXCLUDED.floors END,
        apartment_count = CASE WHEN EXCLUDED.apartment_count = '0' THEN objects.apartment_count ELSE EXCLUDED.apartment_count END,
        deadline = CASE WHEN EXCLUDED.deadline = '—' THEN objects.deadline ELSE EXCLUDED.deadline END,
        customer = CASE WHEN EXCLUDED.customer = '—' THEN objects.customer ELSE EXCLUDED.customer END,
        updated_at = NOW()
      WHERE objects.is_uysot = false
    `;
    console.log(`  ${Math.min(i + batchSize, valid.length)} / ${valid.length}`);
  }

  if (newObjects.length === 0) {
    console.log("Yangi obyekt yo'q.");
    return;
  }

  const byRegion = {};
  for (const o of newObjects) byRegion[o.region_soato] = (byRegion[o.region_soato] || 0) + 1;
  const preview = newObjects.map(o => ({
    source_id: o.source_id,
    object_name: o.object_name,
    region_soato: o.region_soato,
    region_name: o.region_name,
    district_soato: o.district_soato,
    district_name: o.district_name,
    address: o.address,
    latitude: o.latitude,
    longitude: o.longitude,
    floors: o.floors,
    apartment_count: o.apartment_count,
    customer: o.customer,
    builder: '—',
    created_at: o.created_at
  }));

  const nowIso = new Date().toISOString();
  await sql`
    INSERT INTO notifications (
      notif_id, title, summary, sync_date, new_count, by_region_json, new_objects_json, is_read, created_at
    ) VALUES (
      ${`notif_${Date.now()}`},
      ${`Yangi obyektlar: O'zbekiston bo'ylab ${newObjects.length} ta yangi bino aniqlandi`},
      ${`DSHK monitoringi orqali respublika bo'ylab ${newObjects.length} ta yangi ko'p xonadonli turar-joy majmuasi aniqlandi.`},
      ${nowIso}, ${newObjects.length}, ${JSON.stringify(byRegion)}::jsonb, ${JSON.stringify(preview)}::jsonb, false, NOW()
    )
  `;
  console.log(`Tayyor: ${newObjects.length} ta yangi obyekt va bildirishnoma qo'shildi.`);
}

run().catch(err => {
  console.error('XATOLIK:', err.message);
  process.exit(1);
});
