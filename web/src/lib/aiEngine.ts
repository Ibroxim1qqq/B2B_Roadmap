import type { AIRoutePlanResult, AIPitchBriefing, AIChatAction } from './types.ts';
import { calculateDistance } from './utils.ts';
import { getDistrictName, REGION_LIST } from './regions.ts';

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
    soato: ['1726290'],
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
    keywords: ['shayxontohur', 'shayhontohur', 'shayhantahur', 'шайхантахур', 'шайхонтохур', 'shayhon', 'shayxon', 'шайхон', 'shayxontoxur', 'shayhontoxur'],
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

/** Lowercases and removes apostrophes, so ko'p, ko‘p and kop all compare equal. */
export function normalizeText(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/['‘’ʻʼ`´]/g, '').replace(/\s+/g, ' ').trim();
}

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'б', c: 'к', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з'
};

// Domtut names and notes are in Russian, while people usually type in Latin.
function transliterate(term: string): string {
  return term.split('').map(ch => LATIN_TO_CYRILLIC[ch] ?? ch).join('');
}

interface ResolvedLocation extends DistrictMeta {
  isRegion: boolean;
  matchedLength: number;
}

const stripDistrictSuffix = (name: string) => normalizeText(name).replace(/\s*(tumani|shahar|shahri|viloyati|respublikasi)$/, '');

// Covers every region and district of the country, not only the hand-curated registry above.
const GENERATED_LOCATIONS: (DistrictMeta & { isRegion: boolean })[] = REGION_LIST.flatMap(region => [
  {
    name: region.name,
    shortName: region.name,
    regionName: region.name,
    regionSoato: region.soato,
    keywords: [normalizeText(region.name), stripDistrictSuffix(region.name)],
    center: region.center,
    soato: [],
    radiusKm: 0,
    isRegion: true
  },
  ...region.districts.map(d => ({
    name: d.name,
    shortName: d.name.replace(/\s*(tumani|shahar)$/, ''),
    regionName: region.name,
    regionSoato: region.soato,
    keywords: [normalizeText(d.name), stripDistrictSuffix(d.name)],
    center: region.center,
    soato: d.soato ? [d.soato] : [],
    radiusKm: 0,
    isRegion: false
  }))
]);

const ALL_LOCATIONS = [
  ...DISTRICT_REGISTRY.map(d => ({ ...d, isRegion: d.name === d.regionName || /viloyati$/.test(d.name) })),
  ...GENERATED_LOCATIONS
];

/** The location named most specifically wins, so "Samarqand tumani" is not read as Samarqand city. */
export function resolveLocation(query: string): ResolvedLocation | null {
  const q = normalizeText(query);
  let best: ResolvedLocation | null = null;
  for (const location of ALL_LOCATIONS) {
    for (const keyword of location.keywords) {
      const kw = normalizeText(keyword);
      if (kw.length >= 3 && q.includes(kw) && (!best || kw.length > best.matchedLength)) {
        best = { ...location, matchedLength: kw.length };
      }
    }
  }
  return best;
}

function districtLabel(o: any): string {
  return o.district_name || getDistrictName(String(o.district_soato || '')) || o.district || '';
}

export function objectInLocation(o: any, location: ResolvedLocation): boolean {
  const soato = String(o.district_soato || '');
  const regionSoato = String(o.region_soato || soato.substring(0, 4));
  if (location.isRegion) return regionSoato === location.regionSoato;
  if (soato && location.soato.includes(soato)) return true;

  const name = normalizeText(districtLabel(o));
  const keywords = location.keywords.map(normalizeText);
  // A known district is the answer; address text and distance are only for objects without one.
  if (name) return keywords.some(kw => name.includes(kw));
  if (regionSoato && regionSoato !== location.regionSoato) return false;

  const haystack = normalizeText(`${o.address || ''} ${o.object_name || ''} ${o.tjm_name || ''}`);
  if (keywords.some(kw => haystack.includes(kw))) return true;
  const lat = parseFloat(o.latitude);
  const lng = parseFloat(o.longitude);
  return location.radiusKm > 0 && Number.isFinite(lat) && Number.isFinite(lng)
    && calculateDistance(location.center[0], location.center[1], lat, lng) <= location.radiusKm;
}

export interface QueryCriteria {
  location: ResolvedLocation | null;
  limit: number;
  exactFloor: number | null;
  minFloor: number | null;
  maxFloor: number | null;
  minApartments: number | null;
  maxApartments: number | null;
  deadlineYear: string | null;
  requirePhone: boolean;
  requireManager: boolean;
  visited: boolean | null;
  highPriority: boolean;
  status: string | null;
  terms: string[];
  wantsRoute: boolean;
  wantsStats: boolean;
  wantsNearest: boolean;
  isGreeting: boolean;
}

const STOP_WORDS = new Set([
  'bino', 'binolar', 'binolari', 'binolarni', 'binoni', 'uy', 'uylar', 'uyni', 'uylarni', 'obyekt', 'obyektlar', 'obyektlari', 'obyektlarni',
  'tjm', 'tjmlar', 'qurilish', 'qurilishlar', 'qurilishlari', 'quruvchi', 'quruvchisi', 'pudratchi', 'pudratchisi', 'buyurtmachi', 'majmua', 'majmuasi', 'loyiha', 'loyihalari',
  'turar', 'joy', 'haqida', 'bormi', 'bor', 'mavjud', 'top', 'topib', 'toping', 'topish', 'korsat', 'korsating', 'korsatib', 'ber', 'bering', 'qaysi', 'qaysilar',
  'kerak', 'menga', 'bizga', 'sizga', 'mening', 'men', 'biz', 'siz', 'yangi', 'eng', 'va', 'yoki', 'bilan', 'uchun', 'ham', 'bolgan', 'boladigan', 'qilib', 'qil',
  'ta', 'tasi', 'tadan', 'tagacha', 'dona', 'yaxshi', 'qulay', 'optimal', 'tez', 'tezkor', 'foydali', 'samarali', 'kerakli', 'qisqa', 'manzil', 'manzili', 'yil', 'yili', 'yilda', 'yilgi', 'nechta', 'qancha', 'jami', 'umumiy', 'statistika', 'statistikasi', 'statistikani', 'hisobot', 'hisoboti', 'hisobotni', 'tuman', 'tumani', 'tumandagi', 'tumanidagi',
  'shahar', 'shahri', 'shahardagi', 'shahridagi', 'viloyat', 'viloyati', 'viloyatdagi', 'viloyatidagi', 'markazi', 'markazidagi', 'hudud', 'hududi', 'hududida', 'hududidagi',
  'qavat', 'qavatli', 'qavatlik', 'qavatdan', 'qavatgacha', 'baland', 'past', 'kop', 'ortiq', 'ziyod', 'kam', 'gacha', 'dan', 'yuqori', 'ustuvor', 'ustuvorlik', 'muhim', 'xonadon', 'xonadonli', 'honadon', 'kvartira', 'kvartirali',
  'telefon', 'telefoni', 'telefonli', 'telefonlari', 'telefonlarini', 'raqam', 'raqami', 'raqamli', 'raqamlari', 'nomer', 'nomeri', 'aloqa', 'kiritilgan', 'rahbar', 'rahbari', 'menejer', 'menejeri', 'direktor', 'boshliq',
  'borilmagan', 'borilgan', 'bormagan', 'borganlar', 'tashrif', 'tashrifi', 'tashrifsiz', 'qilinmagan', 'qilingan', 'marshrut', 'marshruti', 'yonalish', 'tuz', 'tuzib', 'tuzing', 'reja', 'rejasi', 'borish', 'kunlik', 'bugun', 'bugungi', 'ertaga',
  'yaqin', 'yaqinida', 'yaqindagi', 'atrof', 'atrofida', 'atrofimda', 'yonimda', 'topshiriladigan', 'topshirish', 'bitadigan', 'tugaydigan', 'muddat', 'muddati',
  'toxtatilgan', 'muzlatilgan', 'topshirilgan', 'jarayonda', 'jarayondagi', 'qurilayotgan', 'salom', 'assalomu', 'alaykum', 'assalom', 'rahmat', 'yordam', 'nima', 'qanday', 'qila', 'olasan', 'olasiz', 'iltimos', 'ayt', 'ayting'
]);

function floorRange(floors: unknown): [number, number] | null {
  const nums = (String(floors ?? '').match(/\d+/g) || []).map(Number);
  return nums.length > 0 ? [Math.min(...nums), Math.max(...nums)] : null;
}

function apartmentCount(value: unknown): number {
  return parseInt(String(value ?? '').replace(/\D/g, '') || '0', 10);
}

function stemTerm(word: string): string {
  return word.length > 5 ? word.replace(/(larini|larga|larni|lari|lar|dagi|ning|ni|ga|da)$/, '') : word;
}

export function parseCriteria(query: string): QueryCriteria {
  const q = normalizeText(query);
  const location = resolveLocation(q);

  const countMatch = q.match(/(\d+)\s*(?:ta|dona)\b(?!\s*(?:xonadon|honadon|kvartira|qavat))/) || q.match(/(\d+)\s*(?:bino|uy|obyekt|tjm)/);
  const limit = countMatch ? Math.min(Math.max(parseInt(countMatch[1], 10), 1), 20) : 5;

  const minFloorMatch = q.match(/(\d+)\s*-?\s*qavat(?:li)?(?:dan)?\s*(?:kop|ortiq|baland|yuqori|ziyod)/);
  const maxFloorMatch = q.match(/(\d+)\s*-?\s*qavat(?:li)?(?:gacha|dan\s*(?:kam|past))/);
  const exactFloorMatch = !minFloorMatch && !maxFloorMatch ? q.match(/(\d+)\s*-?\s*qavat/) : null;

  const minAptMatch = q.match(/(\d+)\s*(?:ta)?\s*(?:dan)?\s*(?:kop|ortiq|ziyod)\s*(?:xonadon|honadon|kvartira)/)
    || q.match(/(?:xonadon|honadon|kvartira)[^\d]*(\d+)\s*(?:ta)?\s*(?:dan)?\s*(?:kop|ortiq|ziyod)/);
  const maxAptMatch = q.match(/(\d+)\s*(?:ta)?\s*(?:dan)?\s*(?:kam|gacha)\s*(?:xonadon|honadon|kvartira)/)
    || q.match(/(?:xonadon|honadon|kvartira)[^\d]*(\d+)\s*(?:ta)?\s*(?:dan)?\s*(?:kam|gacha)/);

  const notVisited = /(borilmagan|bormagan|tashrif qilinmagan|tashrifsiz)/.test(q);
  const visited = !notVisited && /(borilgan|borganlar|tashrif qilingan)/.test(q);

  let status: string | null = null;
  if (/toxtatilgan/.test(q)) status = 'toxtatilgan';
  else if (/muzlatilgan/.test(q)) status = 'muzlatilgan';
  else if (/topshirilgan/.test(q)) status = 'topshirilgan';
  else if (/(jarayonda|qurilayotgan)/.test(q)) status = 'jarayon';

  const locationKeywords = location ? location.keywords.map(normalizeText) : [];
  const terms = q
    .split(/[^\p{L}\p{N}+]+/u)
    .filter(word => {
      if (!word || STOP_WORDS.has(word) || locationKeywords.some(kw => kw.split(' ').some(part => part.length >= 3 && word.startsWith(part)))) return false;
      // Bare numbers are counts and years; only long digit runs can be part of a phone number.
      if (/^\+?\d+$/.test(word)) return word.replace('+', '').length >= 5;
      if (/^\d+/.test(word)) return false;
      return word.length >= 2;
    })
    .map(stemTerm)
    .filter(term => !STOP_WORDS.has(term));

  const hasFilters = Boolean(location || minFloorMatch || maxFloorMatch || exactFloorMatch || minAptMatch || maxAptMatch || notVisited || visited || status);
  const isGreeting = !hasFilters && terms.length === 0
    && (q === '' || /^(salom|assalom|hello|hi\b|qalaysiz|rahmat|yordam|nima qila|qanday yordam)/.test(q));

  return {
    location,
    limit,
    exactFloor: exactFloorMatch ? parseInt(exactFloorMatch[1], 10) : null,
    minFloor: minFloorMatch ? parseInt(minFloorMatch[1], 10) : null,
    maxFloor: maxFloorMatch ? parseInt(maxFloorMatch[1], 10) : null,
    minApartments: minAptMatch ? parseInt(minAptMatch[1], 10) : null,
    maxApartments: maxAptMatch ? parseInt(maxAptMatch[1], 10) : null,
    deadlineYear: /(?:topshir|bit|tugay|muddat|yil)/.test(q) ? (q.match(/\b(20[2-3]\d)\b/)?.[1] ?? null) : null,
    requirePhone: /(telefon|nomer|raqam|aloqa)/.test(q),
    requireManager: /(rahbar|menejer|direktor|boshliq)/.test(q),
    visited: notVisited ? false : visited ? true : null,
    highPriority: /(yuqori ustuvor|ustuvor|muhim|priority)/.test(q),
    status,
    terms,
    wantsRoute: /\b(marshrut|yonalish|reja|borish)/.test(q),
    wantsStats: /\b(nechta|qancha|jami|statistika|hisobot|umumiy)/.test(q),
    wantsNearest: /\b(yaqin|atrof|yonimda)/.test(q),
    isGreeting
  };
}

function matchesFilters(o: any, c: QueryCriteria): boolean {
  if (c.location && !objectInLocation(o, c.location)) return false;

  if (c.exactFloor !== null || c.minFloor !== null || c.maxFloor !== null) {
    const range = floorRange(o.floors);
    if (!range) return false;
    if (c.exactFloor !== null && (c.exactFloor < range[0] || c.exactFloor > range[1])) return false;
    if (c.minFloor !== null && range[1] < c.minFloor) return false;
    if (c.maxFloor !== null && range[0] > c.maxFloor) return false;
  }
  if (c.minApartments !== null || c.maxApartments !== null) {
    const apartments = apartmentCount(o.apartment_count);
    if (apartments === 0) return false;
    if (c.minApartments !== null && apartments < c.minApartments) return false;
    if (c.maxApartments !== null && apartments > c.maxApartments) return false;
  }
  if (c.deadlineYear && !String(o.deadline || '').includes(c.deadlineYear)) return false;
  if (c.requirePhone && !(o.phone || o.manager_phone)) return false;
  if (c.requireManager && !o.manager_name) return false;
  const isVisited = Boolean(o.last_visit || o.is_visited);
  if (c.visited !== null && isVisited !== c.visited) return false;
  if (c.highPriority && o.priority !== 'Yuqori') return false;
  if (c.status && !normalizeText(o.status).includes(c.status)) return false;
  return true;
}

function termHits(o: any, terms: string[]): number {
  if (terms.length === 0) return 0;
  const text = normalizeText([
    o.object_name, o.tjm_name, o.builder, o.developer, o.customer, o.manager_name, o.phone,
    o.manager_phone, o.address, o.notes, o.sales_office, o.class_building
  ].filter(Boolean).join(' '));
  return terms.filter(term => text.includes(term) || text.includes(transliterate(term))).length;
}

/** Whether the object's own name carries every term; such objects come before address or note matches. */
function nameHasAllTerms(o: any, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const name = normalizeText(`${o.object_name || ''} ${o.tjm_name || ''}`);
  return terms.every(term => name.includes(term) || name.includes(transliterate(term)));
}

function describeCriteria(c: QueryCriteria): string {
  const parts: string[] = [];
  if (c.location) parts.push(c.location.name);
  if (c.exactFloor !== null) parts.push(`${c.exactFloor} qavatli`);
  if (c.minFloor !== null) parts.push(`kamida ${c.minFloor} qavatli`);
  if (c.maxFloor !== null) parts.push(`${c.maxFloor} qavatgacha`);
  if (c.minApartments !== null) parts.push(`${c.minApartments} tadan ko'p xonadonli`);
  if (c.maxApartments !== null) parts.push(`${c.maxApartments} tagacha xonadonli`);
  if (c.deadlineYear) parts.push(`${c.deadlineYear}-yil muddatli`);
  if (c.requirePhone) parts.push('telefon raqami bor');
  if (c.requireManager) parts.push('rahbari kiritilgan');
  if (c.visited === false) parts.push('hali borilmagan');
  if (c.visited === true) parts.push('tashrif qilingan');
  if (c.highPriority) parts.push('yuqori ustuvorlikdagi');
  if (c.status) parts.push(`holati: ${c.status}`);
  if (c.terms.length > 0) parts.push(`"${c.terms.join(' ')}"`);
  return parts.map(p => `**${p}**`).join(', ');
}

function shortName(o: any): string {
  const name = o.tjm_name && o.tjm_name !== o.object_name ? `${o.tjm_name} (${o.object_name})` : (o.object_name || o.tjm_name || 'Bino');
  return name.length > 110 ? `${name.slice(0, 107)}...` : name;
}

function toSuggestion(o: any, distanceKm?: number) {
  return {
    source_id: String(o.source_id),
    object_name: shortName(o),
    district_name: districtLabel(o) || o.region_name || '—',
    floors: o.floors || '—',
    apartment_count: o.apartment_count || '0',
    deadline: o.deadline || '',
    phone: o.phone || o.manager_phone || '',
    manager_name: o.manager_name || '',
    builder: o.builder || o.developer || '—',
    latitude: parseFloat(o.latitude),
    longitude: parseFloat(o.longitude),
    ...(distanceKm !== undefined ? { dist_km: distanceKm.toFixed(1) } : {})
  };
}

function formatList(items: ReturnType<typeof toSuggestion>[]): string {
  return items.map((s, idx) => {
    const details = [
      s.district_name,
      s.floors !== '—' ? `${s.floors} qavat` : '',
      s.apartment_count !== '0' ? `${s.apartment_count} xonadon` : ''
    ].filter(Boolean).join(', ');
    const lines = [`${idx + 1}. 🏢 **${s.object_name}**${s.dist_km ? ` (~${s.dist_km} km)` : ''}`, `   📍 ${details}`];
    if (s.deadline && s.deadline !== '—') lines.push(`   📅 Muddat: ${s.deadline}`);
    if (s.builder && s.builder !== '—') lines.push(`   🏗️ Quruvchi: ${s.builder}`);
    if (s.phone) lines.push(`   📞 ${s.phone}`);
    return lines.join('\n');
  }).join('\n\n');
}

function overviewReply(total: number, companyName: string, isUysot: boolean): string {
  const place = isUysot ? 'Yunusobod' : 'Urgut';
  return `Assalomu alaykum! Men **${companyName}** bazasidagi **${total.toLocaleString()} ta** obyekt bo'yicha yordam beraman.\n\n` +
    `Masalan, shunday so'rang:\n` +
    `• "${place}dagi 5 ta borilmagan bino"\n` +
    `• "${place}da nechta obyekt bor?"\n` +
    `• "10 qavatdan baland, telefoni bor binolar"\n` +
    `• "100 tadan ko'p xonadonli binolarga marshrut tuz"\n` +
    `• "Menga eng yaqin 3 ta bino"\n` +
    `• Yoki quruvchi, bino nomi yoki telefonni yozing`;
}

function statsReply(scope: any[], title: string): string {
  const total = scope.length;
  const visited = scope.filter(o => o.last_visit || o.is_visited).length;
  const withPhone = scope.filter(o => o.phone || o.manager_phone).length;
  const withManager = scope.filter(o => o.manager_name).length;
  const apartments = scope.reduce((sum, o) => sum + apartmentCount(o.apartment_count), 0);

  const byDistrict = new Map<string, number>();
  for (const o of scope) {
    const label = districtLabel(o);
    if (label) byDistrict.set(label, (byDistrict.get(label) || 0) + 1);
  }
  const top = [...byDistrict.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `📊 ${title}\n\n` +
    `• **Jami obyektlar:** ${total.toLocaleString()} ta\n` +
    `• **Tashrif qilingan:** ${visited.toLocaleString()} ta (${Math.round((visited / (total || 1)) * 100)}%)\n` +
    `• **Hali borilmagan:** ${(total - visited).toLocaleString()} ta\n` +
    `• **Telefoni bor:** ${withPhone.toLocaleString()} ta\n` +
    `• **Rahbari kiritilgan:** ${withManager.toLocaleString()} ta\n` +
    `• **Jami xonadonlar:** ${apartments.toLocaleString()} ta` +
    (top.length > 1 ? `\n\n**Eng ko'p obyekt bor tumanlar:**\n${top.map(([name, n]) => `• ${name}: ${n} ta`).join('\n')}` : '');
}

/** Answers strictly from the data: a filter that matches nothing says so instead of showing something else. */
export function analyzeAndSearchDatabase(
  query: string,
  pool: any[],
  companyName: string,
  userLat?: number,
  userLng?: number,
  isUysot: boolean = false
): { replyText: string; suggestedObjects: any[]; routeStops: any[]; actions: AIChatAction[]; matchedCount: number } {
  const c = parseCriteria(query);
  const actions: AIChatAction[] = [];
  const nothing = { suggestedObjects: [], routeStops: [], actions, matchedCount: 0 };

  if (c.isGreeting) {
    return { ...nothing, replyText: overviewReply(pool.length, companyName, isUysot), matchedCount: pool.length };
  }

  if (c.location && !pool.some(o => objectInLocation(o, c.location!))) {
    return {
      ...nothing,
      replyText: `**${c.location.name}** hududida sizning bazangizda obyekt yo'q. **${companyName}** bazasida jami ${pool.length.toLocaleString()} ta obyekt bor, boshqa hududni so'rab ko'ring.`
    };
  }

  const filtered = pool.filter(o => matchesFilters(o, c));
  let scope = filtered;
  let partial = false;
  if (c.terms.length > 0) {
    scope = filtered.filter(o => termHits(o, c.terms) === c.terms.length);
    if (scope.length === 0 && c.terms.length > 1) {
      scope = filtered.filter(o => termHits(o, c.terms) > 0);
      partial = scope.length > 0;
    }
  }

  const described = describeCriteria(c);

  if (c.wantsStats && c.terms.length === 0) {
    const title = described ? `${described} bo'yicha statistika:` : `**${companyName}** bazasining statistikasi:`;
    return { ...nothing, replyText: statsReply(scope, title), matchedCount: scope.length };
  }

  if (scope.length === 0) {
    const base = c.location ? pool.filter(o => objectInLocation(o, c.location!)).length : pool.length;
    const where = c.location ? `**${c.location.name}** hududida` : 'Bazada';
    return {
      ...nothing,
      replyText: described
        ? `${described} shartiga mos obyekt topilmadi. ${where} jami ${base.toLocaleString()} ta obyekt bor, shartni yumshatib ko'ring.`
        : overviewReply(pool.length, companyName, isUysot)
    };
  }

  if (c.wantsRoute) {
    const planner = smartHeuristicPlanner(scope, userLat, userLng, false, false, c.limit, undefined, isUysot, c.location?.center);
    const byId = new Map(scope.map(o => [String(o.source_id), o]));
    const suggestedObjects = planner.recommended_stops.map(s => toSuggestion(byId.get(String(s.source_id))));
    actions.push({
      type: 'apply_route',
      label: "🚗 Xaritada Marshrutni Chizish (Navigator)",
      route_stops: planner.recommended_stops
    });
    return {
      replyText: `${described ? `${described} bo'yicha ` : ''}**${planner.recommended_stops.length} ta** obyektdan kunlik marshrut tuzildi (~${planner.estimated_duration_hours} soat, mos kelgani jami ${scope.length.toLocaleString()} ta).\n\nQuyidagi tugma navigatorni ochadi:`,
      suggestedObjects,
      routeStops: planner.recommended_stops,
      actions,
      matchedCount: scope.length
    };
  }

  const hasUserPosition = Boolean(userLat && userLng);
  const useUserPosition = hasUserPosition && (c.wantsNearest || !c.location
    || calculateDistance(userLat!, userLng!, c.location.center[0], c.location.center[1]) <= 35);
  const reference: [number, number] | null = useUserPosition
    ? [userLat!, userLng!]
    : c.location ? c.location.center
    : c.wantsNearest ? (isUysot ? [41.2995, 69.2401] : [39.6542, 66.9597])
    : null;

  const ranked = scope
    .filter(o => Number.isFinite(parseFloat(o.latitude)) && Number.isFinite(parseFloat(o.longitude)))
    .map(o => ({
      o,
      hits: (partial ? termHits(o, c.terms) : 0) + (nameHasAllTerms(o, c.terms) ? c.terms.length + 1 : 0),
      km: reference ? calculateDistance(reference[0], reference[1], parseFloat(o.latitude), parseFloat(o.longitude)) : undefined
    }))
    .sort((a, b) => {
      if (a.hits !== b.hits) return b.hits - a.hits;
      if (a.km !== undefined && b.km !== undefined) return a.km - b.km;
      const visitedDiff = Number(Boolean(a.o.last_visit || a.o.is_visited)) - Number(Boolean(b.o.last_visit || b.o.is_visited));
      if (visitedDiff !== 0) return visitedDiff;
      return apartmentCount(b.o.apartment_count) - apartmentCount(a.o.apartment_count);
    })
    .slice(0, c.limit);

  const suggestedObjects = ranked.map(r => toSuggestion(r.o, r.km));
  const heading = partial
    ? `Aniq mos obyekt topilmadi, ${described} so'zlaridan birortasiga mos **${scope.length.toLocaleString()} ta** natija bor.`
    : `${described || 'So\'rovingiz'} bo'yicha **${scope.length.toLocaleString()} ta** obyekt topildi${useUserPosition ? ', sizga eng yaqinlari' : c.location ? ', hudud markaziga eng yaqinlari' : ''}:`;

  actions.push({
    type: 'apply_route',
    label: `🚗 Ushbu ${ranked.length} ta bino bo'yicha marshrut chizish`,
    route_stops: ranked.map((r, idx) => ({
      source_id: String(r.o.source_id),
      order: idx + 1,
      object_name: r.o.tjm_name || r.o.object_name,
      reason: r.km !== undefined ? `${r.km.toFixed(1)} km masofada joylashgan` : `${districtLabel(r.o) || 'Hudud'} hududida joylashgan`,
      pitch_tip: r.o.phone || r.o.manager_phone ? `Tel: ${r.o.phone || r.o.manager_phone}` : "Sotuv ofisiga bevosita tashrif buyuring",
      latitude: parseFloat(r.o.latitude),
      longitude: parseFloat(r.o.longitude)
    }))
  });
  actions.push({ type: 'view_object', label: "📍 1-binoni xaritada ko'rish", source_id: suggestedObjects[0]?.source_id });
  if (c.location) {
    actions.push({
      type: 'apply_filter',
      label: `🔍 Xaritada faqat "${c.location.shortName}"ni ko'rish`,
      filter: { region: c.location.regionSoato, ...(c.location.isRegion ? {} : { district: c.location.shortName }) }
    });
  }

  return {
    replyText: `${heading}\n\n${formatList(suggestedObjects)}`,
    suggestedObjects,
    routeStops: [],
    actions,
    matchedCount: scope.length
  };
}

/** Applies a free-text route request to the pool; used by the route planner dialog. */
export function filterPoolByPrompt(pool: any[], prompt?: string): { scope: any[]; center?: [number, number] } {
  if (!prompt?.trim()) return { scope: pool };
  const c = parseCriteria(prompt);
  const filtered = pool.filter(o => matchesFilters(o, c));
  const scope = c.terms.length > 0 ? filtered.filter(o => termHits(o, c.terms) === c.terms.length) : filtered;
  // Free text the engine cannot read must not empty the plan; an explicit filter that matched nothing may.
  const hasFilter = filtered.length !== pool.length;
  return { scope: scope.length > 0 || hasFilter ? scope : pool, center: c.location?.center };
}

export function smartHeuristicPlanner(
  pool: any[],
  userLat?: number,
  userLng?: number,
  unvisitedOnly?: boolean,
  highPriorityOnly?: boolean,
  maxStops: number = 5,
  prompt?: string,
  isUysot: boolean = false,
  areaCenter?: [number, number]
): AIRoutePlanResult {
  const startLat = userLat || areaCenter?.[0] || (isUysot ? 41.2995 : 39.6542);
  const startLng = userLng || areaCenter?.[1] || (isUysot ? 69.2401 : 66.9597);

  const filtered = pool.filter(obj => {
    if (unvisitedOnly && (obj.is_visited || obj.last_visit)) return false;
    if (highPriorityOnly && obj.priority !== 'Yuqori') return false;
    return Number.isFinite(parseFloat(obj.latitude)) && Number.isFinite(parseFloat(obj.longitude));
  });

  // Score candidates based on: Distance, Priority, Unvisited bonus, Has phone bonus
  const scored = filtered.map(obj => {
    const km = calculateDistance(startLat, startLng, parseFloat(obj.latitude), parseFloat(obj.longitude));
    let score = Math.max(0, 50 - km * 2.5);
    if (obj.priority === 'Yuqori') score += 30;
    else if (obj.priority === "O'rta") score += 15;
    if (!obj.last_visit && !obj.is_visited) score += 25;
    if (obj.phone || obj.manager_phone) score += 15;
    if (apartmentCount(obj.apartment_count) > 100) score += 15;
    return { obj, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and order them using Nearest Neighbor
  const stopCount = Math.min(Math.max(Math.floor(maxStops) || 5, 1), 20);
  const remaining = new Set(scored.slice(0, stopCount).map(s => s.obj));
  const ordered: any[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  while (remaining.size > 0) {
    let nearest: any = null;
    let minDist = Infinity;
    for (const item of remaining) {
      const d = calculateDistance(currentLat, currentLng, parseFloat(item.latitude), parseFloat(item.longitude));
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }
    ordered.push(nearest);
    remaining.delete(nearest);
    currentLat = parseFloat(nearest.latitude);
    currentLng = parseFloat(nearest.longitude);
  }

  const stops = ordered.map((obj, idx) => {
    const size = [
      obj.apartment_count && obj.apartment_count !== '0' ? `${obj.apartment_count} xonadonli` : '',
      obj.floors && obj.floors !== '—' ? `${obj.floors} qavatli` : ''
    ].filter(Boolean).join(', ') || "ko'p qavatli";
    const isVisited = Boolean(obj.last_visit || obj.is_visited);
    const phone = obj.phone || obj.manager_phone;

    return {
      source_id: String(obj.source_id),
      order: idx + 1,
      object_name: shortName(obj),
      reason: `${districtLabel(obj) || 'Shu'} hududidagi ${size} majmua. ${isVisited ? 'Yangi tijoriy taklif bilan uchrashish tavsiya etiladi.' : 'Hali tashrif buyurilmagan, birinchi aloqa uchun ayni vaqt.'}`,
      pitch_tip: `Bino rahbari yoki sotuv ofisiga kirib, maxsus B2B shartlarni taqdim qiling.${phone ? ` Tel: ${phone}.` : ''}`,
      latitude: parseFloat(obj.latitude),
      longitude: parseFloat(obj.longitude)
    };
  });

  const title = prompt?.trim();
  return {
    route_name: title ? `AI Tavsiya: ${title.length > 35 ? `${title.slice(0, 35)}...` : title}` : 'Kunlik Eng Optimal B2B Marshrut',
    summary: stops.length > 0
      ? `Tanlangan ${stops.length} ta TJM minimal yo'l bosib o'tish uchun ketma-ket joylashtirildi.`
      : "Berilgan shartlarga mos obyekt topilmadi. Shartlarni yumshatib ko'ring.",
    estimated_duration_hours: Math.round((stops.length * 0.75) * 10) / 10,
    engine_used: 'heuristic',
    recommended_stops: stops
  };
}

export function smartHeuristicBriefing(obj: any): AIPitchBriefing {
  const name = obj.tjm_name || obj.object_name || 'Qurilish obyekti';
  const apartments = apartmentCount(obj.apartment_count);
  const floors = obj.floors && obj.floors !== '—' ? obj.floors : '';
  const builder = [obj.builder, obj.developer, obj.customer].find(v => v && v !== '—') || '';
  const size = [floors ? `${floors} qavatli` : '', apartments ? `${apartments} xonadonli` : ''].filter(Boolean).join(', ');
  const phone = obj.phone || obj.manager_phone;

  return {
    source_id: String(obj.source_id || ''),
    object_name: name,
    profile_summary: `${name}${size ? ` — ${size} turar-joy majmuasi` : ''}.${builder ? ` Quruvchi: ${builder}.` : ''}`,
    selling_points: [
      apartments >= 100
        ? `Katta hajm (${apartments} xonadon): ulgurji xarid va uzoq muddatli shartnoma imkoniyati.`
        : apartments > 0
        ? `${apartments} xonadonli loyiha: aniq hajm bo'yicha tezkor taklif berish mumkin.`
        : `Xonadonlar soni noma'lum: birinchi uchrashuvda loyiha hajmini aniqlang.`,
      obj.deadline && obj.deadline !== '—'
        ? `Topshirish muddati ${obj.deadline}: yetkazib berish jadvalini shu sanaga moslab taklif qiling.`
        : `Qurilish bosqichini aniqlang, pardozlash va muhandislik jihozlari uchun vaqtni tanlash muhim.`,
      phone ? `To'g'ridan-to'g'ri aloqa mavjud (${phone}), oldindan qo'ng'iroq qilib uchrashuv belgilang.` : `Telefon yo'q: sotuv ofisiga borib mas'ul shaxs bilan tanishing.`
    ],
    negotiation_strategy: `Uchrashuvda ${builder ? `"${builder}" uchun ` : ''}uzluksiz yetkazib berish kafolati, chegirma va bo'lib to'lash shartlarini asosiy ustunlik sifatida ko'rsating.`,
    previous_context_tip: obj.notes ? `Oldingi eslatma: "${obj.notes}"` : 'Ilgari eslatma qoldirilmagan.'
  };
}
