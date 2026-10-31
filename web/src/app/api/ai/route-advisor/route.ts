import { NextResponse } from 'next/server';
import { AIRoutePlanResult, AIPitchBriefing, MapObject, AIChatMessage, AIChatAction } from '../../../../lib/types';
import { haversineMeters } from '../../../../lib/routeUtils';
import { db } from '../../../../lib/db';
import realSheetsData from '../../../../lib/real-sheets-data.json';
import uysotDomtutData from '../../../../lib/uysot-domtut-data.json';

export const dynamic = 'force-dynamic';

const isUysotCompany = (cid?: string | null): boolean => {
  if (!cid) return false;
  const clean = String(cid).trim().toLowerCase();
  return clean === 'uysot' || 
         clean === 'comp_1789981554543' || 
         clean === 'uysot.uz' || 
         clean === 'uysot_uz' || 
         clean.includes('uysot');
};

const uysotRows: any[] = (Array.isArray(uysotDomtutData) ? uysotDomtutData : (uysotDomtutData as any).rows || []) as any[];
const realSheetsRows: any[] = (realSheetsData.rows as any[]) || [];

interface RequestBody {
  action?: 'chat' | 'plan_route' | 'pitch_briefing';
  company_id?: string;
  message?: string;
  user_lat?: number;
  user_lng?: number;
  prompt?: string;
  unvisited_only?: boolean;
  high_priority_only?: boolean;
  max_stops?: number;
  objects_pool?: any[];
  target_object?: any;
}

// -------------------------------------------------------------
// Database Cache (60s TTL for fast instant responses)
// -------------------------------------------------------------
let cachedPool: any[] | null = null;
let cachedPoolTime = 0;
const CACHE_TTL_MS = 60 * 1000;

async function getFullDatabasePool(companyId?: string): Promise<any[]> {
  const now = Date.now();
  if (cachedPool && cachedPool.length > 0 && (now - cachedPoolTime) < CACHE_TTL_MS) {
    return cachedPool;
  }
  try {
    const list = await db.getObjects(companyId);
    if (list && list.length > 0) {
      cachedPool = list;
      cachedPoolTime = now;
      return list;
    }
  } catch (err) {
    console.warn('DB getObjects error, using local fallback:', err);
  }

  const fallback = [...realSheetsRows, ...uysotRows];
  cachedPool = fallback;
  cachedPoolTime = now;
  return fallback;
}

// -------------------------------------------------------------
// Comprehensive District & Regional Center Registry
// -------------------------------------------------------------
interface DistrictMeta {
  name: string;
  shortName: string;
  regionName: string;
  regionSoato: string;
  keywords: string[];
  center: [number, number];
  soato: string[];
  radiusKm: number;
}

const DISTRICT_REGISTRY: DistrictMeta[] = [
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
  // Samarqand viloyati
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
    name: 'Oqdaryo tumani',
    shortName: 'Oqdaryo',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['oqdaryo', 'акдарья', 'оқдарё'],
    center: [39.8000, 66.8333],
    soato: ['1718203'],
    radiusKm: 15.0
  },
  {
    name: 'Ishtixon tumani',
    shortName: 'Ishtixon',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['ishtixon', 'иштыхан', 'иштихон'],
    center: [39.9625, 66.4883],
    soato: ['1718212'],
    radiusKm: 15.0
  },
  {
    name: 'Payariq tumani',
    shortName: 'Payariq',
    regionName: 'Samarqand viloyati',
    regionSoato: '1718',
    keywords: ['payariq', 'пайарык', 'паяриқ'],
    center: [39.9917, 66.8500],
    soato: ['1718233'],
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

// -------------------------------------------------------------
// 1. Smart Heuristic Local AI Chat & Search Engine (Ground Truth)
// -------------------------------------------------------------
function analyzeAndSearchDatabase(
  query: string,
  pool: any[],
  companyName: string,
  userLat?: number,
  userLng?: number,
  isUysot: boolean = false
): {
  replyText: string;
  suggestedObjects: any[];
  routeStops: any[];
  actions: AIChatAction[];
} {
  const q = (query || '').toLowerCase().trim();
  const total = pool.length;
  const visited = pool.filter(o => Boolean(o.last_visit || o.is_visited)).length;
  const withPhone = pool.filter(o => Boolean(o.phone || o.manager_phone)).length;
  const withManager = pool.filter(o => Boolean(o.manager_name)).length;
  const highPriority = pool.filter(o => o.priority === 'Yuqori').length;

  const actions: AIChatAction[] = [];
  let suggestedObjects: any[] = [];
  let routeStops: any[] = [];
  let replyText = '';

  // Extract requested count (e.g. "5ta", "10 ta", "3 dona")
  const countMatch = q.match(/(\d+)\s*(?:ta|dona|bino|uy|obyekt)/i);
  const requestedLimit = countMatch ? Math.min(Math.max(parseInt(countMatch[1], 10), 1), 20) : 5;

  // A. Check for Route Planning queries ("marshrut", "yo'nalish", "borish", "plan", "reja")
  const isRouteQuery = q.includes('marshrut') || q.includes('yo\'nalish') || q.includes('yonalish') || q.includes('borish') || q.includes('reja');
  if (isRouteQuery) {
    const planner = smartHeuristicPlanner(pool, userLat, userLng, q.includes('borilmagan'), q.includes('yuqori'), requestedLimit, query, isUysot);
    routeStops = planner.recommended_stops;
    suggestedObjects = planner.recommended_stops.map(s => {
      const match = pool.find(p => String(p.source_id) === String(s.source_id)) || {};
      return {
        source_id: s.source_id,
        object_name: s.object_name,
        district_name: match.district_name || 'Shahar',
        floors: match.floors || '—',
        apartment_count: match.apartment_count || '0',
        phone: match.phone || match.manager_phone || '',
        manager_name: match.manager_name || '',
        builder: match.builder || '—',
        latitude: s.latitude,
        longitude: s.longitude
      };
    });

    replyText = `Siz uchun **${companyName}** bazasidagi eng qulay va kam vaqt sarflanadigan **${routeStops.length} ta TJM** bo'yicha kunlik optimal marshrut tuzildi (~${planner.estimated_duration_hours} soat).
\nQuyidagi **"Xaritada Marshrutni Chizish"** tugmasini bossangiz, avtomobil navigatori avtomatik ishga tushadi:`;

    actions.push({
      type: 'apply_route',
      label: '🚗 Xaritada Marshrutni Chizish (Navigator)',
      route_stops: planner.recommended_stops
    });

    return { replyText, suggestedObjects, routeStops, actions };
  }

  // B. Check for Statistics queries ("nechta", "jami", "statistika", "hisobot", "umumiy")
  const isStatsQuery = q.includes('nechta') || q.includes('jami') || q.includes('statistika') || q.includes('hisobot') || q.includes('qancha');
  if (isStatsQuery) {
    replyText = `📊 **${companyName} Bazasining Joriy Statistikasi:**\n\n` +
      `• **Jami obyektlar soni:** **${total.toLocaleString()} ta**\n` +
      `• **Tashrif buyurilganlar:** **${visited.toLocaleString()} ta** (${Math.round((visited / (total || 1)) * 100)}%)\n` +
      `• **Hali borilmaganlar:** **${(total - visited).toLocaleString()} ta**\n` +
      `• **Telefon raqami mavjud:** **${withPhone.toLocaleString()} ta**\n` +
      `• **Mas'ul rahbari kiritilgan:** **${withManager.toLocaleString()} ta**\n` +
      `• **Yuqori ustuvorlikdagi (Priority):** **${highPriority.toLocaleString()} ta**\n\n` +
      `Qaysi tuman yoki aniq obyekt bo'yicha ma'lumot olmoqchisiz? Shunchaki tuman yoki pudratchi nomini yozing.`;
    return { replyText, suggestedObjects: [], routeStops: [], actions };
  }

  // C. Intelligent District / Location Targeted Search (e.g. "Yunusobotdagi 5ta menga eng yaqin uyni korsat")
  const matchedDistrict = DISTRICT_REGISTRY.find(d => 
    d.keywords.some(kw => q.includes(kw))
  );

  if (matchedDistrict) {
    // Determine reference coordinate
    let refLat = matchedDistrict.center[0];
    let refLng = matchedDistrict.center[1];
    let isUserNearby = false;

    if (userLat && userLng) {
      const distToDistrict = haversineMeters(userLat, userLng, refLat, refLng);
      // If user is within 35 km of this district, compute distance from user's actual live position
      if (distToDistrict <= 35000) {
        refLat = userLat;
        refLng = userLng;
        isUserNearby = true;
      }
    }

    // Filter candidates in this district
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

      // Geometric radius check if coordinates exist
      if (o.latitude && o.longitude) {
        const lat = parseFloat(o.latitude);
        const lng = parseFloat(o.longitude);
        const dist = haversineMeters(matchedDistrict.center[0], matchedDistrict.center[1], lat, lng);
        if (dist <= matchedDistrict.radiusKm * 1000) {
          if (matchedDistrict.regionSoato === '1726' && lat < 41.1) return false;
          if (matchedDistrict.regionSoato === '1718' && lat > 40.5) return false;
          return true;
        }
      }
      return false;
    });

    if (candidates.length > 0) {
      const sorted = candidates.map(o => {
        const lat = parseFloat(o.latitude) || refLat;
        const lng = parseFloat(o.longitude) || refLng;
        const dist_m = haversineMeters(refLat, refLng, lat, lng);
        return {
          ...o,
          dist_m,
          dist_km: (dist_m / 1000).toFixed(2)
        };
      }).sort((a, b) => a.dist_m - b.dist_m).slice(0, requestedLimit);

      suggestedObjects = sorted.map(o => ({
        source_id: String(o.source_id),
        object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
        district_name: o.district_name || matchedDistrict.shortName,
        floors: o.floors || '—',
        apartment_count: o.apartment_count || '0',
        phone: o.phone || o.manager_phone || '',
        manager_name: o.manager_name || '',
        builder: o.builder || '—',
        latitude: parseFloat(o.latitude),
        longitude: parseFloat(o.longitude),
        dist_km: o.dist_km
      }));

      const locationNote = isUserNearby
        ? `Sizning joriy joylashuvingizga ko'ra`
        : `**${matchedDistrict.name}** markaziga nisbatan`;

      replyText = `📍 ${locationNote} eng yaqin **${suggestedObjects.length} ta** qurilish obyekti va turar-joy majmuasi topildi:\n\n` +
        suggestedObjects.map((s, idx) => {
          const ph = s.phone ? `\n   📞 Aloqa: **${s.phone}**` : '';
          const bld = s.builder && s.builder !== '—' ? `\n   🏗️ Quruvchi: ${s.builder}` : '';
          return `${idx + 1}. 🏢 **${s.object_name}** (~${s.dist_km} km)\n` +
                 `   📍 Manzil: ${s.district_name}${s.floors !== '—' ? `, ${s.floors} qavat` : ''}${s.apartment_count !== '0' ? `, ${s.apartment_count} xonadon` : ''}${bld}${ph}`;
        }).join('\n\n') +
        `\n\nQuyidagi tugmalar orqali xaritada marshrut chizishingiz yoki bino tafsilotlarini ochishingiz mumkin:`;

      actions.push({
        type: 'apply_route',
        label: `🚗 Ushbu ${suggestedObjects.length} ta bino bo'yicha marshrut chizish`,
        route_stops: sorted.map((s, idx) => ({
          source_id: String(s.source_id),
          order: idx + 1,
          object_name: s.tjm_name || s.object_name,
          reason: `${s.dist_km} km masofada joylashgan`,
          pitch_tip: `${matchedDistrict.shortName}dagi eng qulay bino`,
          latitude: parseFloat(s.latitude),
          longitude: parseFloat(s.longitude)
        }))
      });

      if (suggestedObjects.length > 0) {
        actions.push({
          type: 'view_object',
          label: `📍 1-binoni xaritada ko'rish`,
          source_id: suggestedObjects[0].source_id
        });
      }

      actions.push({
        type: 'apply_filter',
        label: `🔍 Xaritada faqat "${matchedDistrict.shortName}"ni ko'rish`,
        filter: { district: matchedDistrict.shortName }
      });

      return { replyText, suggestedObjects, routeStops: [], actions };
    }
  }

  // D. Generic Nearest queries ("yaqin", "atrof", "yon") without specific district
  const isNearestQuery = q.includes('yaqin') || q.includes('atrof') || q.includes('yon');
  if (isNearestQuery) {
    const lat = userLat || (isUysot ? 41.2995 : 39.6542);
    const lng = userLng || (isUysot ? 69.2401 : 66.9597);
    const sorted = [...pool]
      .filter(o => o.latitude && o.longitude)
      .map(o => ({
        ...o,
        dist_m: haversineMeters(lat, lng, parseFloat(o.latitude), parseFloat(o.longitude))
      }))
      .sort((a, b) => a.dist_m - b.dist_m)
      .slice(0, requestedLimit);

    suggestedObjects = sorted.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude),
      dist_km: (o.dist_m / 1000).toFixed(1)
    }));

    replyText = `Sizga eng yaqin joylashgan **${suggestedObjects.length} ta bino** topildi:\n\n` +
      suggestedObjects.map((s, idx) => `${idx + 1}. **${s.object_name}** (~${s.dist_km} km) - ${s.district_name}`).join('\n') +
      `\n\nQuyidagi tugma orqali ushbu binolar bo'yicha darhol xaritada marshrut chizishingiz mumkin:`;

    actions.push({
      type: 'apply_route',
      label: '🚗 Ushbu binolar bo\'yicha marshrut chizish',
      route_stops: sorted.map((s, idx) => ({
        source_id: String(s.source_id),
        order: idx + 1,
        object_name: s.tjm_name || s.object_name,
        reason: `${(s.dist_m / 1000).toFixed(1)} km masofada joylashgan`,
        pitch_tip: 'Eng qulay va tezkor yetib boriladigan bino',
        latitude: parseFloat(s.latitude),
        longitude: parseFloat(s.longitude)
      }))
    });

    return { replyText, suggestedObjects, routeStops: [], actions };
  }

  // E. Phone queries ("telefon", "nomer", "tel", "aloqa")
  const isPhoneQuery = (q.includes('telefon') || q.includes('nomer') || q.includes('aloqa')) && !q.includes('+998');
  if (isPhoneQuery) {
    const withPhoneList = pool.filter(o => Boolean(o.phone || o.manager_phone));
    const top = withPhoneList.slice(0, requestedLimit);
    suggestedObjects = top.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude)
    }));

    replyText = `Tizimda telefon raqami kiritilgan jami **${withPhoneList.length.toLocaleString()} ta** bino mavjud. Quyida dastlabki ${top.length} tasi keltirildi:`;
    return { replyText, suggestedObjects, routeStops, actions };
  }

  // F. Manager queries ("rahbar", "menejer", "direktor", "boshliq")
  const isManagerQuery = q.includes('rahbar') || q.includes('menejer') || q.includes('direktor') || q.includes('boshliq');
  if (isManagerQuery) {
    const withMgrList = pool.filter(o => Boolean(o.manager_name));
    const top = withMgrList.slice(0, requestedLimit);
    suggestedObjects = top.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude)
    }));

    replyText = `Tizimda mas'ul rahbari qayd etilgan jami **${withMgrList.length.toLocaleString()} ta** bino mavjud. Quyida dastlabki ${top.length} tasi:`;
    return { replyText, suggestedObjects, routeStops, actions };
  }

  // G. Multi-Criteria and Keyword Search across all fields
  const STOP_WORDS = new Set([
    'bino', 'binolar', 'binolari', 'qurilish', 'quruvchi', 'quruvchisi', 'quruvchisining',
    'haqida', 'bormi', 'mavjud', 'top', 'korsat', 'ko\'rsat', 'qaysi', 'qaysilar', 'kerak',
    'menga', 'bizga', 'uylar', 'majmua', 'loyiha', 'loyihalari'
  ]);

  const queryWords = q
    .replace(/[?,.!"']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  const keywordMatches = pool.filter(o => {
    const name = (o.object_name || '').toLowerCase();
    const tjm = (o.tjm_name || '').toLowerCase();
    const builder = (o.builder || '').toLowerCase();
    const customer = (o.customer || '').toLowerCase();
    const mgr = (o.manager_name || '').toLowerCase();
    const phone = (o.phone || o.manager_phone || '').toLowerCase();
    const addr = (o.address || '').toLowerCase();
    const notes = (o.notes || '').toLowerCase();

    return queryWords.some(word => 
      name.includes(word) || 
      tjm.includes(word) || 
      builder.includes(word) || 
      customer.includes(word) || 
      mgr.includes(word) || 
      phone.includes(word) ||
      addr.includes(word) ||
      notes.includes(word)
    );
  });

  if (keywordMatches.length > 0) {
    const topMatches = keywordMatches.slice(0, requestedLimit);
    suggestedObjects = topMatches.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude)
    }));

    replyText = `Sizning so'rovingiz bo'yicha **${keywordMatches.length} ta** bino topildi. Quyida dastlabki ${topMatches.length} tasi keltirildi:`;

    if (suggestedObjects.length > 0) {
      actions.push({
        type: 'view_object',
        label: `📍 1-binoni xaritada ko'rish`,
        source_id: suggestedObjects[0].source_id
      });
    }

    return { replyText, suggestedObjects, routeStops: [], actions };
  }

  // H. General Helpful Overview Response
  replyText = `Salom! Men tizimdagi **${total.toLocaleString()} ta** bino bo'yicha yordamchi AI assistentman.\n\n` +
    `Menga erkin savol berishingiz mumkin, masalan:\n` +
    `• *"Yunusobotdagi 5ta menga eng yaqin uyni ko'rsat"*\n` +
    `• *"Chilonzor tumanidagi yangi qurilishlar qaysilar?"*\n` +
    `• *"Samarqand markazidagi borilmagan 5 ta binoga marshrut tuz"*\n` +
    `• *"Pudratchisi 'NRG' yoki 'Golden House' bo'lgan binolar"*\n` +
    `• *"Telefon raqami kiritilgan binolarni ko'rsat"*\n` +
    `• *"Jami nechta obyekt bor va statistika qanday?"*`;

  return { replyText, suggestedObjects: [], routeStops: [], actions };
}

// -------------------------------------------------------------
// 2. Smart Heuristic Route Planner
// -------------------------------------------------------------
function smartHeuristicPlanner(
  pool: MapObject[],
  userLat?: number,
  userLng?: number,
  unvisitedOnly?: boolean,
  highPriorityOnly?: boolean,
  maxStops: number = 5,
  prompt?: string,
  isUysot: boolean = false
): AIRoutePlanResult {
  const startLat = userLat || (isUysot ? 41.2995 : 39.6542);
  const startLng = userLng || (isUysot ? 69.2401 : 66.9597);
  const promptLower = (prompt || '').toLowerCase();

  // If prompt explicitly mentions a district, prioritize candidates in that district!
  let candidates = pool;
  const districtMentioned = DISTRICT_REGISTRY.find(d => 
    d.keywords.some(kw => promptLower.includes(kw))
  );

  if (districtMentioned) {
    const distMatches = pool.filter(o => {
      const d = (o.district_name || '').toLowerCase();
      const addr = (o.address || '').toLowerCase();
      return districtMentioned.keywords.some(kw => d.includes(kw) || addr.includes(kw)) ||
             districtMentioned.soato.includes(String(o.district_soato || ''));
    });
    if (distMatches.length > 0) {
      candidates = distMatches;
    }
  }

  // Apply filters
  let filtered = candidates.filter(obj => {
    if (unvisitedOnly && (obj.is_visited || obj.last_visit)) return false;
    if (highPriorityOnly && obj.priority !== 'Yuqori') return false;
    if (!obj.latitude || !obj.longitude) return false;
    return true;
  });

  if (filtered.length === 0) {
    filtered = pool.filter(obj => Boolean(obj.latitude && obj.longitude));
  }

  // Score candidates based on: Distance, Priority, Unvisited bonus, Has phone bonus
  const scored = filtered.map(obj => {
    const distMeters = haversineMeters(startLat, startLng, parseFloat(String(obj.latitude)), parseFloat(String(obj.longitude)));
    let score = 0;

    const km = distMeters / 1000;
    score += Math.max(0, 50 - km * 2.5);

    if (obj.priority === 'Yuqori') score += 30;
    else if (obj.priority === "O'rta") score += 15;

    if (!obj.last_visit && !obj.is_visited) score += 25;
    if (obj.phone || obj.manager_phone) score += 15;

    const apts = parseInt(obj.apartment_count || '0', 10);
    if (apts > 100) score += 15;

    return { obj, score, distMeters };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and order them using Nearest Neighbor
  const selected = scored.slice(0, Math.min(maxStops, scored.length)).map(s => s.obj);
  const ordered: MapObject[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  const unvisitedSet = new Set(selected);

  while (unvisitedSet.size > 0) {
    let nearest: MapObject | null = null;
    let minDist = Infinity;

    for (const item of unvisitedSet) {
      const d = haversineMeters(currentLat, currentLng, parseFloat(String(item.latitude)), parseFloat(String(item.longitude)));
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }

    if (nearest) {
      ordered.push(nearest);
      unvisitedSet.delete(nearest);
      currentLat = parseFloat(String(nearest.latitude));
      currentLng = parseFloat(String(nearest.longitude));
    } else {
      break;
    }
  }

  const stops = ordered.map((obj, idx) => {
    const apt = obj.apartment_count && obj.apartment_count !== '0' ? `${obj.apartment_count} xonadonli` : 'ko\'p qavatli';
    const fl = obj.floors && obj.floors !== '—' ? `${obj.floors} qavatli` : '';
    const hasPhone = Boolean(obj.phone || obj.manager_phone);
    const unvisited = !obj.last_visit;

    let reason = `${obj.district_name || 'Shahar'} hududidagi ${apt} (${fl}) majmua.`;
    if (unvisited) {
      reason += ' Hali tashrif buyurilmagan, birinchi aloqa uchun ayni vaqt.';
    } else {
      reason += ` Yangi tijoriy taklif bilan uchrashish tavsiya etiladi.`;
    }

    let pitch_tip = `Bino rahbari yoki sotuv ofisiga kirib, ${apt} qurilish hajmi uchun maxsus B2B shartlarni taqdim qiling.`;
    if (hasPhone) {
      pitch_tip += ` Tel: ${obj.phone || obj.manager_phone}.`;
    }

    return {
      source_id: String(obj.source_id),
      order: idx + 1,
      object_name: obj.tjm_name ? `${obj.tjm_name} (${obj.object_name})` : obj.object_name,
      reason,
      pitch_tip,
      latitude: parseFloat(String(obj.latitude)),
      longitude: parseFloat(String(obj.longitude))
    };
  });

  return {
    route_name: prompt ? `AI Tavsiya: ${prompt.slice(0, 35)}...` : 'Kunlik Eng Optimal B2B Marshrut',
    summary: `Tanlangan ${stops.length} ta TJM minimal yo'l bosib maksimal sotuv natijasiga erishish uchun ketma-ket joylashtirildi.`,
    estimated_duration_hours: Math.round((stops.length * 0.75) * 10) / 10,
    engine_used: 'heuristic',
    recommended_stops: stops
  };
}

function smartHeuristicBriefing(obj: any): AIPitchBriefing {
  const name = obj.tjm_name || obj.object_name || 'Qurilish obyekti';
  const apts = obj.apartment_count || '0';
  const floors = obj.floors || '—';
  const builder = obj.builder || obj.customer || "Pudrat tashkiloti";
  const notes = obj.notes ? `Oldingi eslatma: "${obj.notes}"` : "Ilgari eslatma qoldirilmagan.";

  return {
    source_id: String(obj.source_id || ''),
    object_name: name,
    profile_summary: `${name} — ${floors} qavatli, ${apts} ta xonadonga mo'ljallangan yirik turar-joy majmuasi. Pudratchi: ${builder}.`,
    selling_points: [
      `Katta hajm (${apts} xonadon) — B2B toptan xarid va uzoq muddatli shartnoma imkoniyati.`,
      `Qurilish bosqichi — pardozlash, fasad va muhandislik jihozlarini yetkazib berish ayni payti.`,
      obj.phone ? `To'g'ridan-to'g'ri aloqa mavjud (${obj.phone}), tezkor muzokara o'tkazish mumkin.` : `Sotuv ofisiga bevosita joyida tashrif buyurib mas'ul shaxs bilan tanishish kerak.`
    ],
    negotiation_strategy: `Uchrashuvda pudratchi '${builder}' manfaatlariga mos keluvchi chegirma, uzluksiz yetkazib berish kafolati va to'lovni bo'lib to'lash shartlarini asosiy ustunlik sifatida ko'rsating.`,
    previous_context_tip: notes
  };
}

// -------------------------------------------------------------
// 3. LLM API Calls (Gemini / Groq)
// -------------------------------------------------------------
async function callGeminiAI(prompt: string, apiKey: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return JSON.parse(text);
}

async function callGroqAI(prompt: string, apiKey: string): Promise<any> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Sen professional B2B sotuv bo\'yicha sun\'iy intellekt maslahatchisisan. Faqat valid JSON formatda javob berasan.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq API');
  return JSON.parse(text);
}

// -------------------------------------------------------------
// 4. Main POST Handler
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const action = body.action || 'chat';
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();

    const isUysot = isUysotCompany(body.company_id);
    const companyName = isUysot ? 'UYSOT.UZ (Toshkent)' : 'Samarqand Qurilish Xaritasi';

    // Connect AI directly to the full live PostgreSQL database!
    let pool: any[] = [];
    if (Array.isArray(body.objects_pool) && body.objects_pool.length >= 100) {
      pool = body.objects_pool;
    } else {
      pool = await getFullDatabasePool(body.company_id);
    }

    if (pool.length === 0) {
      pool = await getFullDatabasePool(body.company_id);
    }

    // ACTION A: Interactive Global Chat & Search
    if (action === 'chat') {
      const userMessage = body.message || body.prompt || '';
      
      // Perform Ground Truth context search from our live database
      const groundTruth = analyzeAndSearchDatabase(
        userMessage,
        pool,
        companyName,
        body.user_lat,
        body.user_lng,
        isUysot
      );

      // If an LLM API key is present, enhance the answer with natural generative reasoning
      if ((geminiKey || groqKey) && userMessage.trim().length > 3) {
        try {
          const sampleContext = groundTruth.suggestedObjects.length > 0
            ? groundTruth.suggestedObjects
            : pool.slice(0, 15).map(o => ({
                id: o.source_id,
                name: o.tjm_name || o.object_name,
                district: o.district_name,
                floors: o.floors,
                apts: o.apartment_count,
                phone: o.phone || o.manager_phone || '',
                manager: o.manager_name || '',
                builder: o.builder || ''
              }));

          const prompt = `
Siz ${companyName} tizimining professional AI Copilot asistetisiz.
Foydalanuvchi savoli: "${userMessage}"

Baza haqiqiy ma'lumotlari:
Jami binolar: ${pool.length} ta
Topilgan mos binolar namunalari:
${JSON.stringify(sampleContext, null, 2)}

Qoidalar:
1. FAQAT berilgan haqiqiy ma'lumotlarga tayangan holda samimiy, aniq va professional O'ZBEK TILIDA javob bering.
2. Xayoliy ma'lumot to'qimang. Telefon raqami, bino nomi va tumanini aniq keltiring.
3. Agar marshrut so'ralsa, eng qulay yo'nalish bo'yicha maslahat bering.

Quyidagi JSON strukturasida javob qaytar:
{
  "reply_text": "Foydalanuvchiga to'liq o'zbek tilidagi tushuntirish va javob"
}
`;
          let llmRes: any;
          if (geminiKey) {
            llmRes = await callGeminiAI(prompt, geminiKey);
          } else {
            llmRes = await callGroqAI(prompt, groqKey!);
          }

          if (llmRes && llmRes.reply_text) {
            groundTruth.replyText = llmRes.reply_text;
          }
        } catch (llmErr: any) {
          console.warn('LLM chat call failed, using heuristic ground truth:', llmErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          text: groundTruth.replyText,
          suggested_objects: groundTruth.suggestedObjects,
          route_stops: groundTruth.routeStops,
          actions: groundTruth.actions
        }
      });
    }

    // ACTION B: Pitch Briefing for single building
    if (action === 'pitch_briefing') {
      const targetObj = body.target_object;
      if (!targetObj) {
        return NextResponse.json({ success: false, error: 'target_object is required' }, { status: 400 });
      }

      if (geminiKey || groqKey) {
        try {
          const prompt = `
Vazifa: Ushbu qurilish obyekti bo'yicha B2B sotuv agentiga muzokara oldidan professional brifing va sotuv maslahati tuzib ber.
Obyekt ma'lumotlari:
- Nomi: ${targetObj.tjm_name || targetObj.object_name}
- Manzil: ${targetObj.address || targetObj.district_name}
- Qavatlar: ${targetObj.floors || 'noma\'lum'}
- Xonadonlar soni: ${targetObj.apartment_count || '0'}
- Quruvchi / Pudratchi: ${targetObj.builder || '—'}
- Buyurtmachi: ${targetObj.customer || '—'}
- Telefon: ${targetObj.phone || targetObj.manager_phone || 'yo\'q'}
- Rahbar: ${targetObj.manager_name || 'yo\'q'}
- Oxirgi tashrif sanasi: ${targetObj.last_visit || 'hech qachon'}
- O'tgan tashrif izohlari: ${targetObj.notes || 'yo\'q'}

Quyidagi JSON strukturasida O'ZBEK TILIDA javob qaytar:
{
  "source_id": "${targetObj.source_id}",
  "object_name": "${targetObj.tjm_name || targetObj.object_name}",
  "profile_summary": "Qisqa obyekt xarakteristikasi (1-2 gap)",
  "selling_points": ["Ushbu binoga qiziqish uyg'otuvchi 1-asos", "2-asos", "3-asos"],
  "negotiation_strategy": "Sotuv agenti rahbar bilan uchrashganda qanday gap boshlashi va qaysi ustunliklarni aytishi kerakligi bo'yicha aniq strategiya",
  "previous_context_tip": "Agar oldingi izoh bo'lsa shunga asoslangan maslahat"
}
`;
          let result: AIPitchBriefing;
          if (geminiKey) {
            result = await callGeminiAI(prompt, geminiKey);
          } else {
            result = await callGroqAI(prompt, groqKey!);
          }
          return NextResponse.json({ success: true, data: result, engine: geminiKey ? 'gemini' : 'groq' });
        } catch (err: any) {
          console.warn('AI Briefing LLM call failed, using heuristic fallback:', err.message);
        }
      }

      const heuristic = smartHeuristicBriefing(targetObj);
      return NextResponse.json({ success: true, data: heuristic, engine: 'heuristic' });
    }

    // ACTION C: Plan Route
    const maxStops = Math.min(body.max_stops || 5, 8);
    const heuristicResult = smartHeuristicPlanner(
      pool,
      body.user_lat,
      body.user_lng,
      body.unvisited_only,
      body.high_priority_only,
      maxStops,
      body.prompt,
      isUysot
    );

    return NextResponse.json({ success: true, data: heuristicResult });
  } catch (error: any) {
    console.error('Route advisor API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
