import fs from 'fs';
import path from 'path';
import { neon } from '../node_modules/@neondatabase/serverless/index.mjs';

const root = 'd:/b2b Samarqand/web';
const envContent = fs.readFileSync(path.join(root, '.env.local'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[match[1]] = val;
  }
});

const sql = neon(process.env.DATABASE_URL);

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function testYunusobodSearch() {
  const allRows = await sql`SELECT * FROM objects`;
  console.log(`Fetched ${allRows.length} total objects from Neon database.`);

  const query = "Yunusobotdagi 5ta menga eng yaqin uyni korsat";
  const q = query.toLowerCase();

  // District keywords check
  const isYunusobod = q.includes('yunusob') || q.includes('yunusabad') || q.includes('юнусаб');
  const countMatch = q.match(/(\d+)\s*(?:ta|dona|bino|uy)/);
  const count = countMatch ? parseInt(countMatch[1]) : 5;

  console.log(`Query: "${query}" -> isYunusobod: ${isYunusobod}, count: ${count}`);

  const yunusobodCenter = [41.3644, 69.2882];
  
  // Filter Yunusobod
  const filtered = allRows.filter(o => {
    const dName = (o.district_name || '').toLowerCase();
    const addr = (o.address || '').toLowerCase();
    const name = (o.object_name || '').toLowerCase();
    const tjm = (o.tjm_name || '').toLowerCase();
    const soato = String(o.district_soato || '');

    if (dName.includes('yunusob') || dName.includes('юнусаб')) return true;
    if (addr.includes('yunusob') || addr.includes('юнусаб')) return true;
    if (name.includes('yunusob') || name.includes('юнусаб')) return true;
    if (tjm.includes('yunusob') || tjm.includes('юнусаб')) return true;

    // Check distance to Yunusobod center if coords exist
    if (o.latitude && o.longitude) {
      const lat = parseFloat(o.latitude);
      const lng = parseFloat(o.longitude);
      const dist = haversineMeters(yunusobodCenter[0], yunusobodCenter[1], lat, lng);
      // If within 5km of Yunusobod center and in Tashkent (lat > 41.3)
      if (dist < 4500 && lat >= 41.32 && lng >= 69.25 && lng <= 69.33) {
        return true;
      }
    }

    return false;
  });

  console.log(`Found ${filtered.length} matching Yunusobod objects.`);

  // Sort by distance to Yunusobod center
  const sorted = filtered.map(o => {
    const lat = parseFloat(o.latitude);
    const lng = parseFloat(o.longitude);
    const dist = haversineMeters(yunusobodCenter[0], yunusobodCenter[1], lat, lng);
    return {
      ...o,
      dist_m: dist,
      dist_km: (dist / 1000).toFixed(2)
    };
  }).sort((a, b) => a.dist_m - b.dist_m).slice(0, count);

  console.log(`\nTop ${count} nearest objects:`);
  sorted.forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.source_id}] ${item.tjm_name || item.object_name}`);
    console.log(`   Manzil: ${item.address}`);
    console.log(`   Qavat: ${item.floors} | Xonadonlar: ${item.apartment_count} | Masofa: ${item.dist_km} km`);
  });
}

testYunusobodSearch().catch(console.error);
