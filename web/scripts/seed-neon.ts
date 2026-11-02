import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl } from './_db-env.mjs';
import fs from 'fs';
import path from 'path';

async function seed() {
  const dbUrl = resolveDatabaseUrl();

  console.log('🌱 Neon PostgreSQL boshlang\'ich ma\'lumotlarini yuklash (Seeding)...');
  const sql = neon(dbUrl);

  // 1. Seed Samarqand DSHK objects
  const dshkPath = path.resolve(process.cwd(), 'src/lib/real-sheets-data.json');
  let dshkCount = 0;
  if (fs.existsSync(dshkPath)) {
    try {
      const dshkData = JSON.parse(fs.readFileSync(dshkPath, 'utf-8'));
      const rows = dshkData.rows || [];
      console.log(`📦 Samarqand DSHK obyektlari yuklanmoqda (${rows.length} ta)...`);

      for (const r of rows) {
        if (!r.source_id) continue;
        const lat = parseFloat(r.latitude) || 39.6542;
        const lng = parseFloat(r.longitude) || 66.9597;

        await sql`
          INSERT INTO objects (
            source_id, object_name, region_soato, region_name, district_soato, district_name,
            address, latitude, longitude, status, status_id, sphere_id, customer, designer,
            builder, difficulty, floors, apartment_count, block_count, deadline, created_at,
            task_id, passport_url, source_url, is_uysot
          ) VALUES (
            ${r.source_id}, ${r.object_name || 'Bino'}, ${r.region_soato || '1718'}, 
            ${r.region_name || 'Samarqand'}, ${r.district_soato || ''}, ${r.district_name || ''},
            ${r.address || ''}, ${lat}, ${lng}, ${r.status || 'Qurilish jarayonida'},
            ${parseInt(r.status_id) || 1}, ${r.sphere_id || '57'}, ${r.customer || '—'},
            ${r.designer || '—'}, ${r.builder || '—'}, ${r.difficulty || 'II-toifa'},
            ${r.floors || '—'}, ${r.apartment_count || '0'}, ${r.block_count || '1'},
            ${r.deadline || '—'}, ${r.created_at || ''}, ${r.task_id || ''},
            ${r.passport_url || ''}, ${r.source_url || ''}, false
          )
          ON CONFLICT (source_id) DO UPDATE SET
            object_name = EXCLUDED.object_name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude;
        `;
        dshkCount++;
      }
      console.log(`✅ ${dshkCount} ta Samarqand DSHK obyekti muvaffaqiyatli yuklandi!`);
    } catch (e: any) {
      console.warn('⚠️ Samarqand DSHK yuklashda xatolik:', e.message);
    }
  }

  // UYSOT objects carry contact data and district mapping, handled by: npm run db:import-domtut
  console.log(`🎉 Jami ${dshkCount} ta DSHK obyekti yuklandi. UYSOT uchun: npm run db:import-domtut`);
}

seed().catch(err => {
  console.error('Seed xatosi:', err);
  process.exit(1);
});
