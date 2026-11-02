// Upserts Domtut objects from a JSON file into Neon. Never deletes, and never touches company_data.
//   node scripts/import-domtut-to-neon.mjs <file.json> [--dry-run]
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl, describeDatabase } from './_db-env.mjs';

// Domtut names districts in Russian; the app's region lists and filters use these names.
const DISTRICTS = {
  'Юнусабадский': ['1726290', 'Yunusobod tumani'],
  'Мирабадский': ['1726266', 'Mirobod tumani'],
  'Яккасарайский': ['1726294', 'Yakkasaroy tumani'],
  'Шайхонтохурский': ['1726287', 'Shayxontohur tumani'],
  'Сергелийский': ['1726273', 'Sergeli tumani'],
  'Яшнабадский': ['1726296', 'Yashnobod tumani'],
  'Мирзо-Улугбекский': ['1726269', "Mirzo Ulug'bek tumani"],
  'Алмазарский': ['1726277', 'Olmazor tumani'],
  'Чиланзарский': ['1726283', 'Chilonzor tumani'],
  'Бектемирский': ['1726262', 'Bektemir tumani'],
  'Учтепинский': ['1726280', 'Uchtepa tumani'],
  'Янгихаётский': ['1726298', 'Yangihayot tumani'],
  'Зангиатинский': ['1727220', 'Zangiota tumani'],
  'Кибрайский': ['1727224', 'Qibray tumani'],
  'Янгиюль': ['1727428', "Yangiyo'l shahar"],
  'Нурафшон': ['1727401', 'Nurafshon shahar'],
  'Бостанлыкский': ['1727212', "Bo'stonliq tumani"],
  'Бекаба́д': ['1727407', 'Bekobod shahar'],
  'Чирчик': ['1727424', 'Chirchiq shahar'],
  'Газалкент': ['1727212', "Bo'stonliq tumani"],
  Salar: ['1727248', 'Toshkent tumani'],
  Keles: ['1727248', 'Toshkent tumani'],
  Nazarbek: ['1727248', 'Toshkent tumani'],
  Sijjak: ['1727212', "Bo'stonliq tumani"],
  Chorvoq: ['1727212', "Bo'stonliq tumani"],
  Iskandar: ['1727212', "Bo'stonliq tumani"]
};

const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!file || file.startsWith('--')) {
  console.error('Foydalanish: node scripts/import-domtut-to-neon.mjs <file.json> [--dry-run]');
  process.exit(1);
}

async function run() {
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const rows = (Array.isArray(raw) ? raw : raw.rows || []).filter(r => r.source_id);
  if (rows.length === 0) throw new Error("Faylda obyekt yo'q, import to'xtatildi");

  const objects = rows
    .map(r => ({
      source_id: String(r.source_id),
      object_name: String(r.object_name || 'Domtut TJM'),
      region_soato: String(r.region_soato || '1726'),
      region_name: String(r.region || r.region_name || 'Toshkent shahri'),
      district_soato: (DISTRICTS[r.district] || [''])[0],
      district_name: (DISTRICTS[r.district] || [])[1] || String(r.district || r.district_name || ''),
      address: String(r.address || ''),
      latitude: parseFloat(r.latitude) || 0,
      longitude: parseFloat(r.longitude) || 0,
      builder: String(r.developer || r.builder || '—'),
      floors: String(r.floors || '—'),
      apartment_count: String(r.apartment_count || '0'),
      block_count: String(r.block_count || '1'),
      deadline: String(r.deadline || '—'),
      source_url: String(r.source_url || ''),
      image_url: String(r.image_url || ''),
      phone: String(r.phone || ''),
      sales_office: String(r.sales_office || ''),
      manager_name: String(r.manager_name || ''),
      manager_phone: String(r.manager_phone || ''),
      telegram: String(r.telegram || ''),
      email: String(r.email || ''),
      notes: String(r.notes || ''),
      price_from: String(r.price_from || ''),
      class_building: String(r.class_building || '')
    }))
    .filter(o => o.latitude && o.longitude);

  const url = resolveDatabaseUrl();
  console.log(`Baza: ${describeDatabase(url)}. Import: ${objects.length} ta obyekt${dryRun ? ' (dry-run)' : ''}`);
  if (dryRun) return;

  const sql = neon(url);
  const batchSize = 200;
  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = JSON.stringify(objects.slice(i, i + batchSize));
    await sql`
      INSERT INTO objects (
        source_id, object_name, region_soato, region_name, district_soato, district_name, address, latitude, longitude,
        builder, floors, apartment_count, block_count, deadline, source_url, image_url,
        phone, sales_office, manager_name, manager_phone, telegram, email, notes, price_from, class_building,
        is_uysot, updated_at
      )
      SELECT
        source_id, object_name, region_soato, region_name, district_soato, district_name, address, latitude, longitude,
        builder, floors, apartment_count, block_count, deadline, source_url, image_url,
        phone, sales_office, manager_name, manager_phone, telegram, email, notes, price_from, class_building,
        true, NOW()
      FROM jsonb_to_recordset(${batch}::jsonb) AS x(
        source_id text, object_name text, region_soato text, region_name text, district_soato text, district_name text, address text,
        latitude numeric, longitude numeric, builder text, floors text, apartment_count text, block_count text,
        deadline text, source_url text, image_url text, phone text, sales_office text, manager_name text,
        manager_phone text, telegram text, email text, notes text, price_from text, class_building text
      )
      ON CONFLICT (source_id) DO UPDATE SET
        object_name = EXCLUDED.object_name,
        region_soato = EXCLUDED.region_soato,
        region_name = EXCLUDED.region_name,
        district_soato = COALESCE(NULLIF(EXCLUDED.district_soato, ''), objects.district_soato),
        district_name = COALESCE(NULLIF(EXCLUDED.district_name, ''), objects.district_name),
        address = COALESCE(NULLIF(EXCLUDED.address, ''), objects.address),
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        builder = EXCLUDED.builder,
        floors = EXCLUDED.floors,
        apartment_count = EXCLUDED.apartment_count,
        block_count = EXCLUDED.block_count,
        deadline = EXCLUDED.deadline,
        source_url = EXCLUDED.source_url,
        image_url = EXCLUDED.image_url,
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), objects.phone),
        sales_office = COALESCE(NULLIF(EXCLUDED.sales_office, ''), objects.sales_office),
        manager_name = COALESCE(NULLIF(EXCLUDED.manager_name, ''), objects.manager_name),
        manager_phone = COALESCE(NULLIF(EXCLUDED.manager_phone, ''), objects.manager_phone),
        telegram = COALESCE(NULLIF(EXCLUDED.telegram, ''), objects.telegram),
        email = COALESCE(NULLIF(EXCLUDED.email, ''), objects.email),
        notes = COALESCE(NULLIF(EXCLUDED.notes, ''), objects.notes),
        price_from = COALESCE(NULLIF(EXCLUDED.price_from, ''), objects.price_from),
        class_building = COALESCE(NULLIF(EXCLUDED.class_building, ''), objects.class_building),
        updated_at = NOW()
      WHERE objects.is_uysot = true
    `;
    console.log(`  ${Math.min(i + batchSize, objects.length)} / ${objects.length}`);
  }
  console.log('Tayyor.');
}

run().catch(err => {
  console.error('XATOLIK:', err.message);
  process.exit(1);
});
