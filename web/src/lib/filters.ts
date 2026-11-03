import type { MapObject } from './types';

export interface AdvancedFilterState {
  tjmName: string; // residential complex name or the object's own name
  brandName: string; // the sales brand a company entered, e.g. 'Golden House'
  companyName: string; // the legal company (MChJ): builder or customer
  clientOwner: string; // whose client this is: one option of the client list
  roomCount: string; // custom room count string, e.g. '1', '2', '3', '4'
  minApartments: string; // e.g. '50'
  maxApartments: string; // e.g. '200'
  minFloors: string; // e.g. '5'
  maxFloors: string; // e.g. '12'
  visitStatus: 'all' | 'visited' | 'not_visited';
  crmStatus: 'all' | 'filled' | 'empty';
  difficulty: string; // 'all' | 'II' | 'III' | 'IV'
  deadlineYear: string; // e.g. '2026'
}

export const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
  tjmName: '',
  brandName: '',
  companyName: '',
  clientOwner: '',
  roomCount: '',
  minApartments: '',
  maxApartments: '',
  minFloors: '',
  maxFloors: '',
  visitStatus: 'all',
  crmStatus: 'all',
  difficulty: 'all',
  deadlineYear: ''
};

export function countActiveFilters(
  filters: AdvancedFilterState,
  selectedDistrict?: string,
  selectedStatus?: string
): number {
  let count = 0;
  if (filters.tjmName && filters.tjmName.trim() !== '') count += 1;
  if (filters.brandName && filters.brandName.trim() !== '') count += 1;
  if (filters.companyName && filters.companyName.trim() !== '') count += 1;
  if (filters.clientOwner && filters.clientOwner.trim() !== '') count += 1;
  if (filters.roomCount && filters.roomCount.trim() !== '') count += 1;
  if (filters.minApartments && filters.minApartments.trim() !== '') count += 1;
  if (filters.maxApartments && filters.maxApartments.trim() !== '') count += 1;
  if (filters.minFloors && filters.minFloors.trim() !== '') count += 1;
  if (filters.maxFloors && filters.maxFloors.trim() !== '') count += 1;
  if (filters.visitStatus && filters.visitStatus !== 'all') count += 1;
  if (filters.crmStatus && filters.crmStatus !== 'all') count += 1;
  if (filters.difficulty && filters.difficulty !== 'all') count += 1;
  if (filters.deadlineYear && filters.deadlineYear.trim() !== '' && filters.deadlineYear !== 'all') count += 1;
  if (selectedDistrict && selectedDistrict !== '' && selectedDistrict !== 'Barcha tumanlar') count += 1;
  if (selectedStatus && selectedStatus !== '' && selectedStatus !== 'Barcha statuslar') count += 1;
  return count;
}

/** Quotes, apostrophe variants and the long form of "MChJ" must not decide whether a name matches. */
export function normalizeFilterText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/['`’‘ʻʼ"«»“”]/g, '')
    .replace(/masuliyati\s+cheklangan\s+jamiyati?/g, 'mchj')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEmptyValue(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return text === '' || text === '—';
}

/** Domtut lists a sales brand as the builder, so it stands in until a company enters its own. */
export function objectBrand(m: MapObject): string {
  if (m.brand_name) return m.brand_name;
  const isDomtut = String(m.source_id).startsWith('domtut_') || Boolean((m as any).is_uysot);
  return isDomtut && !isEmptyValue(m.builder) ? String(m.builder) : '';
}

export interface ObjectFilterCriteria {
  region?: string;
  search?: string;
  district?: string;
  status?: string;
  advanced: AdvancedFilterState;
}

export function matchesObjectFilters(m: MapObject, criteria: ObjectFilterCriteria): boolean {
  const { region: selectedRegion, search: searchQuery = '', district: selectedDistrict, status: selectedStatus, advanced: advancedFilters } = criteria;

  // 1. Region Filter
  if (selectedRegion && m.region_soato !== selectedRegion) {
    return false;
  }

  // 2. Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const name = (m.object_name || '').toLowerCase();
    const tjm = (m.tjm_name || '').toLowerCase();
    const brand = objectBrand(m).toLowerCase();
    const addr = (m.address || m.sales_office || '').toLowerCase();
    const phone = (m.phone || '').toLowerCase();
    const mgr = (m.manager_name || '').toLowerCase();
    const builder = (m.builder || '').toLowerCase();
    const customer = (m.customer || '').toLowerCase();
    if (
      !name.includes(q) &&
      !tjm.includes(q) &&
      !brand.includes(q) &&
      !addr.includes(q) &&
      !phone.includes(q) &&
      !mgr.includes(q) &&
      !builder.includes(q) &&
      !customer.includes(q)
    ) {
      return false;
    }
  }

  // 3. TJM, Brand and MChJ names
  const tjmQuery = normalizeFilterText(advancedFilters.tjmName);
  if (tjmQuery && !normalizeFilterText(`${m.tjm_name || ''} ${m.object_name || ''}`).includes(tjmQuery)) {
    return false;
  }
  // Brand and client are chosen options, so one must not also bring a similar name.
  const brandQuery = normalizeFilterText(advancedFilters.brandName);
  if (brandQuery && normalizeFilterText(objectBrand(m)) !== brandQuery) {
    return false;
  }
  const companyQuery = normalizeFilterText(advancedFilters.companyName);
  if (companyQuery && !normalizeFilterText(`${m.builder || ''} ${m.customer || ''}`).includes(companyQuery)) {
    return false;
  }

  const clientQuery = normalizeFilterText(advancedFilters.clientOwner);
  if (clientQuery && normalizeFilterText(m.client_owner) !== clientQuery) {
    return false;
  }

  // 4. District Filter
  if (selectedDistrict && selectedDistrict !== 'Barcha tumanlar') {
    const dClean = selectedDistrict.toLowerCase().replace(/['`’‘]/g, '').replace(/(\s*tumani|\s*shahar|\s*shahri)$/i, '').trim();
    const mDist = (m.district_name || '').toLowerCase().replace(/['`’‘]/g, '').trim();
    const mAddr = (m.address || '').toLowerCase().replace(/['`’‘]/g, '').trim();
    const mName = (m.object_name || '').toLowerCase().replace(/['`’‘]/g, '').trim();
    const matchesDistrict = (mDist && (mDist.includes(dClean) || dClean.includes(mDist))) || mAddr.includes(dClean) || mName.includes(dClean);
    if (!matchesDistrict) {
      return false;
    }
  }

  // 5. Status Filter (e.g. Jarayonda, To'xtatilgan, Muzlatilgan, Topshirilgan)
  if (selectedStatus && selectedStatus !== 'Barcha statuslar') {
    const s = selectedStatus.toLowerCase().replace(/(da|ida)$/, '').trim();
    const mStatus = (m.status || '').toLowerCase().trim();
    if (!mStatus.includes(s) && !s.includes(mStatus)) {
      return false;
    }
  }

  // 6. Room count (Custom input matching)
  if (advancedFilters.roomCount && advancedFilters.roomCount.trim() !== '') {
    const query = advancedFilters.roomCount.trim();
    const rawName = ((m.object_name || '') + ' ' + (m.tjm_name || '')).toLowerCase();
    const numbers = query.match(/\d+/g) || [];
    if (numbers.length > 0) {
      const matches = numbers.some(num => {
        const word = num === '1' ? 'bir' : num === '2' ? 'ikki' : num === '3' ? 'uch' : num === '4' ? "to['`]?rt" : num;
        const regex = new RegExp('(^|\\D)' + num + '\\s*[-–]?\\s*xona|' + word + '\\s*xona', 'i');
        return regex.test(rawName);
      });
      if (!matches) return false;
    } else {
      if (!rawName.includes(query.toLowerCase())) return false;
    }
  }

  // 7. Apartment Range (Custom min/max)
  if (advancedFilters.minApartments || advancedFilters.maxApartments) {
    const cleanAp = parseInt(String(m.apartment_count || '0').replace(/\D+/g, '') || '0', 10);
    const minAp = advancedFilters.minApartments ? parseInt(advancedFilters.minApartments, 10) : 0;
    const maxAp = advancedFilters.maxApartments ? parseInt(advancedFilters.maxApartments, 10) : Infinity;
    if (cleanAp < minAp || cleanAp > maxAp) return false;
  }

  // 8. Floor Range (Custom min/max)
  if (advancedFilters.minFloors || advancedFilters.maxFloors) {
    // Floors may be a range such as "9-16": keep the object when the range overlaps the filter.
    const floorNumbers = (String(m.floors || '').match(/\d+/g) || []).map(Number);
    const lowFloor = floorNumbers.length ? Math.min(...floorNumbers) : 0;
    const highFloor = floorNumbers.length ? Math.max(...floorNumbers) : 0;
    const minFl = advancedFilters.minFloors ? parseInt(advancedFilters.minFloors, 10) : 0;
    const maxFl = advancedFilters.maxFloors ? parseInt(advancedFilters.maxFloors, 10) : Infinity;
    if (highFloor < minFl || lowFloor > maxFl) return false;
  }

  // 9. Visit Status (Tashrif holati)
  if (advancedFilters.visitStatus && advancedFilters.visitStatus !== 'all') {
    const isVisited = Boolean(m.is_visited || m.last_visit);
    if (advancedFilters.visitStatus === 'visited' && !isVisited) return false;
    if (advancedFilters.visitStatus === 'not_visited' && isVisited) return false;
  }

  // 10. CRM Status (B2B ma'lumot to'ldirilganligi)
  if (advancedFilters.crmStatus && advancedFilters.crmStatus !== 'all') {
    const isFilled = Boolean(m.has_internal || m.phone || m.manager_name || m.tjm_name || m.brand_name || m.client_owner || m.sales_office);
    if (advancedFilters.crmStatus === 'filled' && !isFilled) return false;
    if (advancedFilters.crmStatus === 'empty' && isFilled) return false;
  }

  // 11. Difficulty / Category (Qurilish toifasi)
  if (advancedFilters.difficulty && advancedFilters.difficulty !== 'all') {
    const category = (m.difficulty || '').toUpperCase().match(/^(IV|III|II|I)\b/)?.[1];
    if (category !== advancedFilters.difficulty) return false;
  }

  // 12. Deadline Year (Topshirish muddati)
  if (advancedFilters.deadlineYear && advancedFilters.deadlineYear.trim() !== '' && advancedFilters.deadlineYear !== 'all') {
    const dline = (m.deadline || '').toLowerCase();
    if (!dline.includes(advancedFilters.deadlineYear.trim().toLowerCase())) return false;
  }

  return true;
}

export const DEFAULT_CLIENT_OWNERS = ['UYSOT CRM', 'UYSOT.UZ', 'UYQUR'];

/** The standard options first, then every other name this company has already used on an object. */
function selectOptions(standard: string[], usedNames: unknown[]): string[] {
  const options = new Map<string, string>(standard.map(name => [normalizeFilterText(name), name]));
  const used = new Map<string, string>();
  for (const value of usedNames) {
    const name = String(value ?? '').trim();
    const key = normalizeFilterText(name);
    if (key && !options.has(key)) used.set(key, name);
  }
  return [...options.values(), ...[...used.values()].sort((a, b) => a.localeCompare(b))];
}

export function clientOwnerOptions(objects: MapObject[]): string[] {
  return selectOptions(DEFAULT_CLIENT_OWNERS, objects.map(m => m.client_owner));
}

export function brandOptions(objects: MapObject[]): string[] {
  return selectOptions([], objects.map(objectBrand));
}

export type FilterNameKind = 'tjm' | 'company';

function namesOf(m: MapObject, kind: FilterNameKind): unknown[] {
  if (kind === 'tjm') return [m.tjm_name, m.object_name];
  return [m.builder, m.customer];
}

/** Names to offer while typing into a filter, limited so the list stays usable. */
export function suggestFilterNames(objects: MapObject[], kind: FilterNameKind, query: string, limit = 30): string[] {
  const q = normalizeFilterText(query);
  const found = new Map<string, string>();
  for (const m of objects) {
    for (const name of namesOf(m, kind)) {
      if (isEmptyValue(name)) continue;
      const key = normalizeFilterText(name);
      if (!found.has(key) && key.includes(q)) found.set(key, String(name).trim());
      if (found.size >= limit) return [...found.values()];
    }
  }
  return [...found.values()];
}
