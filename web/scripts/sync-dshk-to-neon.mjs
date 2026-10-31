import { neon } from '../node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';
import path from 'path';

function getUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), 'web', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }
  const directEnv = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(directEnv)) {
    const content = fs.readFileSync(directEnv, 'utf-8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) return match[1];
  }
  return 'postgresql://neondb_owner:npg_cEL2WJZwG7Ps@ep-calm-cloud-b4ltc7bt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
}

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
  '1730': 'Farg\'ona viloyati',
  '1733': 'Xorazm viloyati',
  '1735': 'Qoraqalpog\'iston Respublikasi',
};

function getRegionName(soato) {
  if (!soato) return 'Noma\'lum hudud';
  const prefix = String(soato).substring(0, 4);
  return REGION_NAMES[prefix] || 'Noma\'lum hudud';
}

function formatDifficulty(d) {
  if (!d) return 'II-toifa';
  const num = parseInt(d);
  if (num === 1) return 'I-toifa';
  if (num === 2) return 'II-toifa';
  if (num === 3) return 'III-toifa';
  if (num === 4) return 'IV-toifa';
  return `${d}-toifa`;
}

async function run() {
  const dbUrl = getUrl();
  console.log('🚀 Connecting to Neon PostgreSQL...');
  const sql = neon(dbUrl);

  // 1. Fetch DSHK API data
  console.log('📡 Fetching construction objects from DSHK API (api-dshk.shaffofqurilish.uz)...');
  const response = await fetch('https://api-dshk.shaffofqurilish.uz/api/list-construction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sphere_id: 57, status: 2 })
  });

  if (!response.ok) {
    throw new Error(`DSHK API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const apiItems = result.data || [];
  console.log(`✅ DSHK API dan ${apiItems.length} ta jami obyekt olindi.`);

  // 2. Fetch existing source_ids from Neon DB
  console.log('🔍 Checking existing objects in Neon database...');
  const existingRows = await sql`SELECT source_id FROM objects WHERE is_uysot = false`;
  const existingSet = new Set(existingRows.map(r => String(r.source_id)));
  console.log(`📊 Neon DB da mavjud bo'lgan obyektlar: ${existingSet.size} ta.`);

  // 3. Find diff (new objects)
  const newItems = apiItems.filter(item => {
    const id = String(item.object_id);
    return !existingSet.has(id);
  });

  console.log(`\n========================================`);
  console.log(`✨ YANGI ANIQLANGAN OBYEKTLAR: ${newItems.length} TA`);
  console.log(`========================================\n`);

  if (newItems.length === 0) {
    console.log('ℹ️ Yangi qo\'shilgan obyektlar yo\'q. Barcha ma\'lumotlar yangilangan.');
    return;
  }

  // 4. Parse each new object
  const parsedObjects = [];
  const byRegion = {};
  const newBuildingList = [];

  for (const item of newItems) {
    let parsed = {};
    if (item.object_json) {
      try {
        parsed = typeof item.object_json === 'string' ? JSON.parse(item.object_json) : item.object_json;
      } catch (e) {
        parsed = {};
      }
    }

    const sourceId = String(item.object_id);
    const regSoato = String(parsed.region_soato || item.region_soato || '1718');
    const distSoato = String(parsed.district_soato || item.district_soato || '');
    const regName = getRegionName(regSoato);
    const objName = (parsed.name || item.name || 'Ko\'p xonadonli turar-joy binosi').trim();
    const address = (parsed.location_building || item.address || regName).trim();
    const lat = parseFloat(parsed.lat || item.lat) || 0;
    const lng = parseFloat(parsed.long || item.long) || 0;
    const floors = String(item.max_floor || parsed.floors || '—');
    const apartmentCount = String(item.apartment_count || parsed.apartment_count || '0');
    const blockCount = String(item.block_count || parsed.block_count || '1');
    const deadline = String(parsed.deadline || item.dedline || '—');
    const customer = (parsed.organization_name || item.customer || '—').trim();
    const difficulty = formatDifficulty(parsed.difficulty);
    const taskId = String(parsed.task_id || '');
    const createdAt = item.created_at || new Date().toISOString();

    byRegion[regSoato] = (byRegion[regSoato] || 0) + 1;

    parsedObjects.push({
      source_id: sourceId,
      object_name: objName,
      region_soato: regSoato,
      region_name: regName,
      district_soato: distSoato,
      district_name: '',
      address: address,
      latitude: lat,
      longitude: lng,
      status: 'Qurilish jarayonida',
      status_id: 1,
      sphere_id: '57',
      sphere_name: 'Ko\'p xonadonli uy-joylar',
      customer: customer,
      designer: '—',
      builder: '—',
      difficulty: difficulty,
      floors: floors,
      apartment_count: apartmentCount,
      block_count: blockCount,
      deadline: deadline,
      created_at: createdAt,
      task_id: taskId,
      passport_url: '',
      source_url: '',
      image_url: '',
      is_uysot: false
    });

    newBuildingList.push({
      source_id: sourceId,
      object_name: objName,
      region_soato: regSoato,
      region_name: regName,
      district_soato: distSoato,
      district_name: '',
      address: address,
      latitude: lat,
      longitude: lng,
      floors: floors,
      apartment_count: apartmentCount,
      customer: customer,
      builder: '—',
      created_at: createdAt
    });
  }

  // 5. Batch insert into Neon DB objects table
  console.log(`📥 Neon PostgreSQL ga ${parsedObjects.length} ta yangi obyekt kiritilmoqda...`);
  const batchSize = 25;
  let insertedCount = 0;

  for (let i = 0; i < parsedObjects.length; i += batchSize) {
    const batch = parsedObjects.slice(i, i + batchSize);
    for (const obj of batch) {
      await sql`
        INSERT INTO objects (
          source_id, object_name, region_soato, region_name, district_soato, district_name,
          address, latitude, longitude, status, status_id, sphere_id, sphere_name, customer,
          designer, builder, difficulty, floors, apartment_count, block_count, deadline,
          created_at, task_id, passport_url, source_url, image_url, is_uysot, updated_at
        ) VALUES (
          ${obj.source_id}, ${obj.object_name}, ${obj.region_soato}, ${obj.region_name},
          ${obj.district_soato}, ${obj.district_name}, ${obj.address}, ${obj.latitude},
          ${obj.longitude}, ${obj.status}, ${obj.status_id}, ${obj.sphere_id},
          ${obj.sphere_name}, ${obj.customer}, ${obj.designer}, ${obj.builder},
          ${obj.difficulty}, ${obj.floors}, ${obj.apartment_count}, ${obj.block_count},
          ${obj.deadline}, ${obj.created_at}, ${obj.task_id}, ${obj.passport_url},
          ${obj.source_url}, ${obj.image_url}, false, NOW()
        )
        ON CONFLICT (source_id) DO UPDATE SET
          object_name = EXCLUDED.object_name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          floors = EXCLUDED.floors,
          apartment_count = EXCLUDED.apartment_count,
          deadline = EXCLUDED.deadline,
          customer = EXCLUDED.customer,
          updated_at = NOW();
      `;
      insertedCount++;
    }
    console.log(`  - ${insertedCount} / ${parsedObjects.length} obyekt kiritildi`);
  }

  // 6. Record Weekly Sync Notification
  console.log('\n🔔 Yangi bildirishnoma yaratilmoqda...');
  const notifId = `notif_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const notifTitle = `Yangi obyektlar: O'zbekiston bo'ylab ${parsedObjects.length} ta yangi bino aniqlandi`;
  const notifSummary = `DSHK (Shaffof Qurilish) monitoringi orqali respublika bo'ylab ${parsedObjects.length} ta yangi ko'p xonadonli turar-joy majmuasi aniqlandi va tizimga muvaffaqiyatli kiritildi.`;

  await sql`
    INSERT INTO notifications (
      notif_id, title, summary, sync_date, new_count, by_region_json, new_objects_json, is_read, created_at
    ) VALUES (
      ${notifId}, ${notifTitle}, ${notifSummary}, ${nowIso}, ${parsedObjects.length},
      ${JSON.stringify(byRegion)}, ${JSON.stringify(newBuildingList)}, false, NOW()
    )
  `;
  console.log(`✅ Bildirishnoma Neon DB ga saqlandi: "${notifTitle}"`);

  // 7. Update local cache web/src/lib/notifications.json for fallback / SSR
  const notifCachePath = path.resolve(process.cwd(), 'web/src/lib/notifications.json');
  try {
    let cachedNotifs = [];
    if (fs.existsSync(notifCachePath)) {
      cachedNotifs = JSON.parse(fs.readFileSync(notifCachePath, 'utf-8'));
      if (!Array.isArray(cachedNotifs)) cachedNotifs = [];
    }
    cachedNotifs.unshift({
      id: notifId,
      title: notifTitle,
      summary: notifSummary,
      timestamp: nowIso,
      new_count: parsedObjects.length,
      by_region: byRegion,
      new_objects: newBuildingList,
      is_read: false
    });
    fs.writeFileSync(notifCachePath, JSON.stringify(cachedNotifs.slice(0, 30), null, 2), 'utf-8');
    console.log(`💾 notifications.json kesh fayli yangilandi.`);
  } catch (err) {
    console.warn('⚠️ notifications.json kesh yangilashda ogohlantirish:', err.message);
  }

  // 8. Update backup file real-sheets-data.json
  const sheetsBackupPath = path.resolve(process.cwd(), 'web/src/lib/real-sheets-data.json');
  try {
    if (fs.existsSync(sheetsBackupPath)) {
      const backupData = JSON.parse(fs.readFileSync(sheetsBackupPath, 'utf-8'));
      const existingRows = backupData.rows || [];
      const combined = [...parsedObjects, ...existingRows];
      backupData.rows = combined;
      backupData.last_updated = nowIso;
      fs.writeFileSync(sheetsBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(`💾 real-sheets-data.json zaxira fayli yangilandi (jami ${combined.length} ta).`);
    }
  } catch (err) {
    console.warn('⚠️ real-sheets-data.json yangilashda ogohlantirish:', err.message);
  }

  // 9. Summary Print
  console.log(`\n🎉 SINKRONIZATSIYA MUVAFFAQIYATLI YAKUNLANDI!`);
  console.log(`----------------------------------------`);
  console.log(`Yangi qo'shilgan obyektlar: ${parsedObjects.length} ta`);
  console.log(`Hududlar bo'yicha taqsimot:`);
  for (const [regSoato, count] of Object.entries(byRegion)) {
    console.log(`  - ${getRegionName(regSoato)} (${regSoato}): ${count} ta bino`);
  }
  console.log(`----------------------------------------`);
}

run().catch(err => {
  console.error('❌ XATOLIK:', err);
  process.exit(1);
});
