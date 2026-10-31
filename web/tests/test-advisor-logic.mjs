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

const DISTRICT_REGISTRY = [
  // Toshkent shahri
  {
    name: 'Yunusobod tumani',
    shortName: 'Yunusobod',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['yunusob', 'yunusabad', 'юнусаб', 'юнусобод'],
    center: [41.3644, 69.2882],
    soato: ['1726290', '1726266'],
    radiusKm: 6.5
  },
  {
    name: 'Chilonzor tumani',
    shortName: 'Chilonzor',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['chilonzor', 'chilanzar', 'чиланзар', 'чилонзор'],
    center: [41.2721, 69.2045],
    soato: ['1726283'],
    radiusKm: 6.0
  },
  {
    name: 'Mirzo Ulug\'bek tumani',
    shortName: 'Mirzo Ulug\'bek',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['mirzo ulug', 'mirzo-ulug', 'ulugbek', 'мирзо улуг', 'мирзо-улуг'],
    center: [41.3283, 69.3328],
    soato: ['1726269'],
    radiusKm: 7.0
  },
  {
    name: 'Mirobod tumani',
    shortName: 'Mirobod',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['mirobod', 'mirabad', 'мирабад', 'миробод'],
    center: [41.2917, 69.2819],
    soato: ['1726266'],
    radiusKm: 5.0
  },
  {
    name: 'Yakkasaroy tumani',
    shortName: 'Yakkasaroy',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['yakkasaroy', 'yakkasaray', 'яккасарай', 'яккасарой'],
    center: [41.2825, 69.2508],
    soato: ['1726294'],
    radiusKm: 4.5
  },
  {
    name: 'Yashnobod tumani',
    shortName: 'Yashnobod',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['yashnobod', 'yashnabad', 'яшнабад', 'яшнобод'],
    center: [41.2952, 69.3344],
    soato: ['1726296', '1726290'],
    radiusKm: 6.5
  },
  {
    name: 'Sergeli tumani',
    shortName: 'Sergeli',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['sergeli', 'сергели'],
    center: [41.2225, 69.2217],
    soato: ['1726273'],
    radiusKm: 7.0
  },
  {
    name: 'Yangihayot tumani',
    shortName: 'Yangihayot',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['yangihayot', 'янгихаёт', 'янги хаёт'],
    center: [41.1983, 69.1917],
    soato: ['1726298'],
    radiusKm: 6.0
  },
  {
    name: 'Olmazor tumani',
    shortName: 'Olmazor',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['olmazor', 'almazar', 'алмазар', 'олмазор'],
    center: [41.3533, 69.2222],
    soato: ['1726277'],
    radiusKm: 6.0
  },
  {
    name: 'Uchtepa tumani',
    shortName: 'Uchtepa',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['uchtepa', 'учтепа'],
    center: [41.2922, 69.1764],
    soato: ['1726280'],
    radiusKm: 5.5
  },
  {
    name: 'Shayxontohur tumani',
    shortName: 'Shayxontohur',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['shayxontohur', 'shayhantahur', 'шайхантахур', 'шайхонтохур'],
    center: [41.3200, 69.2300],
    soato: ['1726287'],
    radiusKm: 5.0
  },
  {
    name: 'Bektemir tumani',
    shortName: 'Bektemir',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['bektemir', 'бектемир'],
    center: [41.2069, 69.3356],
    soato: ['1726262'],
    radiusKm: 6.0
  },
  {
    name: 'Toshkent shahri',
    shortName: 'Toshkent sh.',
    regionName: 'Toshkent shahri',
    regionSoato: '1726',
    keywords: ['toshkent', 'tashkent', 'тошкент', 'ташкент'],
    center: [41.3111, 69.2797],
    soato: ['1726'],
    radiusKm: 18.0
  },
  // Samarqand
  {
    name: 'Samarqand shahri',
    shortName: 'Samarqand shahar',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['samarqand shahar', 'samarqand shahri', 'самарканд шахар', 'gorod samarkand'],
    center: [39.6542, 66.9597],
    soato: ['1718401'],
    radiusKm: 9.0
  },
  {
    name: 'Urgut tumani',
    shortName: 'Urgut',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['urgut', 'ургут'],
    center: [39.4056, 67.2431],
    soato: ['1718238'],
    radiusKm: 15.0
  },
  {
    name: 'Pastdarg\'om tumani',
    shortName: 'Pastdarg\'om',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['pastdarg', 'past darg', 'пастдаргом'],
    center: [39.6500, 66.6800],
    soato: ['1718227'],
    radiusKm: 15.0
  },
  {
    name: 'Toyloq tumani',
    shortName: 'Toyloq',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['toyloq', 'toyloq', 'тойлок', 'тойлоқ'],
    center: [39.5936, 67.0942],
    soato: ['1718236'],
    radiusKm: 12.0
  },
  {
    name: 'Jomboy tumani',
    shortName: 'Jomboy',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['jomboy', 'жамбай', 'жомбой'],
    center: [39.6983, 67.0917],
    soato: ['1718209'],
    radiusKm: 12.0
  },
  {
    name: 'Bulung\'ur tumani',
    shortName: 'Bulung\'ur',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['bulung', 'булунгур'],
    center: [39.7611, 67.2750],
    soato: ['1718206'],
    radiusKm: 15.0
  },
  {
    name: 'Kattaqo\'rg\'on tumani',
    shortName: 'Kattaqo\'rg\'on',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['kattaqo', 'kattaqorgon', 'каттакурган', 'каттақўрғон'],
    center: [39.8967, 66.2575],
    soato: ['1718406', '1718215'],
    radiusKm: 15.0
  },
  {
    name: 'Samarqand viloyati',
    shortName: 'Samarqand',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['samarqand', 'самарканд'],
    center: [39.6542, 66.9597],
    soato: ['1718'],
    radiusKm: 25.0
  },
  // Buxoro
  {
    name: 'Buxoro viloyati',
    shortName: 'Buxoro',
    regionName: 'Buxoro viloyati',
    regionSoato: '1706',
    keywords: ['buxoro', 'bukhara', 'бухоро'],
    center: [39.7747, 64.4286],
    soato: ['1706'],
    radiusKm: 20.0
  }
];

async function runTests() {
  const pool = await sql`SELECT * FROM objects`;
  console.log(`Loaded ${pool.length} objects from Neon.`);

  const testQueries = [
    "Yunusobotdagi 5ta menga eng yaqin uyni korsat",
    "Chilonzordagi 3 ta uyni ko'rsat",
    "Samarqanddagi eng yaqin 4 ta bino",
    "NRG quruvchisining binolari bormi?",
    "Jami nechta bino bor?"
  ];

  for (const query of testQueries) {
    console.log(`\n==========================================`);
    console.log(`QUERY: "${query}"`);
    console.log(`==========================================`);

    const q = query.toLowerCase().trim();

    // 1. Count extraction
    const countMatch = q.match(/(\d+)\s*(?:ta|dona|bino|uy|obyekt)/i);
    const limit = countMatch ? Math.min(Math.max(parseInt(countMatch[1], 10), 1), 20) : 5;

    // 2. District matching
    const matchedDistrict = DISTRICT_REGISTRY.find(d => 
      d.keywords.some(kw => q.includes(kw))
    );

    if (matchedDistrict) {
      console.log(`Matched district: ${matchedDistrict.name} (center: ${matchedDistrict.center})`);
      const refLat = matchedDistrict.center[0];
      const refLng = matchedDistrict.center[1];

      // Filter candidates
      const candidates = pool.filter(o => {
        const dName = (o.district_name || '').toLowerCase();
        const addr = (o.address || '').toLowerCase();
        const name = (o.object_name || '').toLowerCase();
        const tjm = (o.tjm_name || '').toLowerCase();
        const soato = String(o.district_soato || '');

        const kwHit = matchedDistrict.keywords.some(kw => 
          dName.includes(kw) || addr.includes(kw) || name.includes(kw) || tjm.includes(kw)
        );
        if (kwHit) return true;

        if (matchedDistrict.soato.includes(soato)) return true;

        // Geometric radius check if coords exist
        if (o.latitude && o.longitude) {
          const lat = parseFloat(o.latitude);
          const lng = parseFloat(o.longitude);
          const dist = haversineMeters(refLat, refLng, lat, lng);
          if (dist <= matchedDistrict.radiusKm * 1000) {
            // Tashkent filter safeguard: if target is in Tashkent, object must also be lat > 41
            if (matchedDistrict.regionSoato === '1726' && lat < 41.1) return false;
            // Samarqand filter safeguard: if target is Samarqand, object must be lat < 40.5
            if (matchedDistrict.regionSoato === '1718' && lat > 40.5) return false;
            return true;
          }
        }
        return false;
      });

      console.log(`Candidate count in ${matchedDistrict.name}: ${candidates.length}`);

      const sorted = candidates.map(o => {
        const lat = parseFloat(o.latitude) || refLat;
        const lng = parseFloat(o.longitude) || refLng;
        const dist_m = haversineMeters(refLat, refLng, lat, lng);
        return {
          ...o,
          dist_m,
          dist_km: (dist_m / 1000).toFixed(2)
        };
      }).sort((a, b) => a.dist_m - b.dist_m).slice(0, limit);

      console.log(`Top ${sorted.length} results:`);
      sorted.forEach((s, idx) => {
        console.log(`  ${idx+1}. [${s.source_id}] ${s.tjm_name || s.object_name.slice(0, 50)} (~${s.dist_km} km)`);
      });
    } else {
      console.log(`No district matched. General query.`);
      if (q.includes('nechta') || q.includes('jami')) {
        console.log(`Stat query: Total ${pool.length} objects in DB.`);
      } else {
        // Keyword search
        const matches = pool.filter(o => {
          const text = `${o.object_name} ${o.tjm_name || ''} ${o.builder || ''} ${o.customer || ''} ${o.address || ''}`.toLowerCase();
          return q.split(' ').some(w => w.length > 2 && text.includes(w));
        }).slice(0, limit);
        console.log(`Keyword matches: ${matches.length}`);
        matches.forEach((m, idx) => {
          console.log(`  ${idx+1}. [${m.source_id}] ${m.tjm_name || m.object_name.slice(0, 50)} | ${m.builder}`);
        });
      }
    }
  }
}

runTests().catch(console.error);
