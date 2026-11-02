import { MapObject, ObjectDetail, CustomField, DashboardStats, VisitData, SavedRoute, WeeklySyncNotification, UserSession, AIRoutePlanResult, AIPitchBriefing, AIChatMessage, AIChatAction } from './types';
import { getRegionName, getDistrictName } from './regions';
import { isUysotCompany, rememberCompanyDataSource } from './company';
import { clearStoredUser } from './auth';

export { isUysotCompany, rememberCompanyDataSource };

/** Reads an API response; an expired session sends the user back to the login page. */
async function parseResponse(res: Response): Promise<any> {
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    clearStoredUser();
    window.location.replace('/login');
  }
  try {
    return await res.json();
  } catch {
    return { success: false, error: `Server javobi noto'g'ri (${res.status})` };
  }
}

/** Retries once, because Render and Neon may still be waking up from sleep on the first request. */
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (res.status < 500) return res;
  } catch {
    // Falls through to the single retry.
  }
  await new Promise(resolve => setTimeout(resolve, 1500));
  return fetch(url, init);
}

const SOATO_DISTRICT_MAP: Record<string, string> = {
  '1718401': 'Samarqand shahar',
  '1718406': 'Kattaqo\'rg\'on shahar',
  '1718203': 'Oqdaryo tumani',
  '1718206': 'Bulung\'ur tumani',
  '1718209': 'Jomboy tumani',
  '1718212': 'Ishtixon tumani',
  '1718215': 'Kattaqo\'rg\'on tumani',
  '1718216': 'Qo\'shrabot tumani',
  '1718218': 'Narpay tumani',
  '1718224': 'Nurobod tumani',
  '1718227': 'Pastdarg\'om tumani',
  '1718230': 'Paxtachi tumani',
  '1718233': 'Payariq tumani',
  '1718235': 'Samarqand tumani',
  '1718236': 'Toyloq tumani',
  '1718238': 'Urgut tumani'
};

function formatRowToMapObject(r: any): MapObject {
  if (!r) {
    return {
      source_id: 'unknown',
      object_name: 'Noma\'lum bino',
      tjm_name: '',
      latitude: 39.6542,
      longitude: 66.9597,
      status: 'Qurilish jarayonida',
      status_id: 1,
      region_soato: '1718',
      region_name: 'Samarqand',
      district_soato: '1718401',
      district_name: 'Samarqand',
      sphere_name: "Ko'p xonadonli uy-joylar",
      phone: '',
      sales_office: '',
      manager_name: '',
      manager_phone: '',
      floors: '—',
      apartment_count: '0',
      area: '—',
      image_url: '',
      has_internal: false,
      is_fully_filled: false,
      is_visited: false,
      last_visit: '',
      visited_by: '',
      builder: '—',
      customer: '—',
      address: '',
      deadline: '—',
      telegram: '',
      instagram: '',
      priority: '',
      notes: ''
    };
  }

  const lat = parseFloat(r.latitude) || 39.6542;
  const lng = parseFloat(r.longitude) || 66.9597;
  const regSoato = String(r.region_soato || (r.district_soato ? String(r.district_soato).substring(0, 4) : (lat > 40.5 ? '1726' : '1718')));
  const regName = getRegionName(regSoato);
  const district = getDistrictName(String(r.district_soato || r.district || ''), regSoato) || SOATO_DISTRICT_MAP[r.district_soato] || r.district || (r.district_soato ? `Tuman (${r.district_soato})` : regName);

  const tjm = String(r.tjm_name || '').trim();
  const phone = String(r.phone || '').trim();
  const manager = String(r.manager_name || '').trim();
  const salesOffice = String(r.sales_office || '').trim();
  const lastVisit = String(r.last_visit || '').trim();

  const hasInternal = Boolean(tjm || phone || manager || salesOffice);
  const isFullyFilled = Boolean(tjm && phone && manager);
  const isVisited = Boolean(lastVisit);

  return {
    source_id: String(r.source_id || ''),
    object_name: String(r.object_name || r.tjm_name || 'Qurilish obyekti'),
    tjm_name: tjm,
    latitude: lat,
    longitude: lng,
    status: String(r.status || 'Qurilish jarayonida'),
    status_id: parseInt(r.status_id) || 1,
    region_soato: regSoato,
    region_name: regName,
    district_soato: String(r.district_soato || r.district || '1718401'),
    district_name: district,
    sphere_name: "Ko'p xonadonli uy-joylar",
    phone: phone,
    sales_office: salesOffice,
    manager_name: manager,
    manager_phone: String(r.manager_phone || '').trim(),
    floors: (r.floors && String(r.floors) !== '0') ? String(r.floors).trim() : '—',
    apartment_count: r.apartment_count ? String(r.apartment_count).trim() : '0',
    area: (r.apartment_count && String(r.apartment_count) !== '0') ? `${r.apartment_count} xonadon` : '—',
    image_url: String(r.image_url || ''),
    has_internal: hasInternal,
    is_fully_filled: isFullyFilled,
    is_visited: isVisited,
    last_visit: lastVisit,
    visited_by: String(r.visited_by || '').trim(),
    builder: String(r.builder || r.developer || '—').trim(),
    customer: String(r.customer || '—').trim(),
    address: String(r.address || '').trim(),
    deadline: String(r.deadline || '—').trim(),
    telegram: String(r.telegram || '').trim(),
    instagram: String(r.instagram || '').trim(),
    priority: String(r.priority || '').trim(),
    difficulty: String(r.difficulty || '—').trim(),
    notes: String(r.notes || '').trim()
  };
}

export function formatRowToObjectDetail(r: any): ObjectDetail {
  if (!r) {
    return {
      source: {
        source_id: 'unknown',
        object_name: 'Noma\'lum bino',
        region_soato: '1718',
        region_name: 'Samarqand',
        district_soato: '1718401',
        district_name: 'Samarqand',
        address: 'Manzil ko\'rsatilmagan',
        latitude: 39.6542,
        longitude: 66.9597,
        status: 'Qurilish jarayonida',
        status_id: 1,
        sphere_id: '57',
        sphere_name: "Ko'p xonadonli uy-joylar",
        customer: '—',
        designer: '—',
        builder: '—',
        difficulty: 'II-toifa',
        floors: '—',
        apartment_count: '0',
        area: '—',
        block_count: '1',
        deadline: '—',
        created_at: '',
        task_id: '',
        passport_url: '',
        source_url: '#',
        image_url: ''
      },
      internal: {
        tjm_name: '',
        phone: '',
        sales_office: '',
        manager_name: '',
        manager_phone: '',
        telegram: '',
        instagram: '',
        notes: '',
        priority: '',
        last_visit: '',
        visited_by: '',
        visit_lat_lng: ''
      }
    };
  }

  const lat = parseFloat(r.latitude) || 39.6542;
  const lng = parseFloat(r.longitude) || 66.9597;
  const regSoato = String(r.region_soato || (r.district_soato ? String(r.district_soato).substring(0, 4) : (lat > 40.5 ? '1726' : '1718')));
  const regName = getRegionName(regSoato);
  const district = getDistrictName(String(r.district_soato || r.district || ''), regSoato) || SOATO_DISTRICT_MAP[r.district_soato] || r.district || (r.district_soato ? `Tuman (${r.district_soato})` : regName);

  return {
    source: {
      source_id: String(r.source_id || ''),
      object_name: String(r.object_name || r.tjm_name || ''),
      region_soato: regSoato,
      region_name: regName,
      district_soato: String(r.district_soato || r.district || '1718401'),
      district_name: district,
      address: String(r.address || `${regName}`),
      latitude: lat,
      longitude: lng,
      status: String(r.status || 'Qurilish jarayonida'),
      status_id: parseInt(r.status_id) || 1,
      sphere_id: String(r.sphere_id || '57'),
      sphere_name: "Ko'p xonadonli uy-joylar",
      customer: String(r.customer || '—'),
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
      source_url: String(r.source_url || (String(r.source_id).startsWith('domtut_') ? `https://domtut.uz` : `https://dshk.shaffofqurilish.uz/object/${r.source_id}`)),
      image_url: String(r.image_url || '')
    },
    internal: {
      ...(r.custom_values || {}),
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

export function formatBuildingItemToObjectDetail(b: any): ObjectDetail {
  const lat = parseFloat(b.latitude) || 39.6542;
  const lng = parseFloat(b.longitude) || 66.9597;
  const regSoato = String(b.region_soato || '1718');
  const regName = b.region_name || getRegionName(regSoato) || 'O\'zbekiston';
  const district = b.district_name || getDistrictName(String(b.district_soato || ''), regSoato) || regName;

  return {
    source: {
      source_id: String(b.source_id),
      object_name: b.object_name || 'Yangi qurilish obyekti',
      region_soato: regSoato,
      region_name: regName,
      district_soato: b.district_soato || '',
      district_name: district,
      address: b.address || `${regName}`,
      latitude: lat,
      longitude: lng,
      status: 'Qurilish jarayonida',
      status_id: 1,
      sphere_id: '57',
      sphere_name: "Ko'p xonadonli uy-joylar",
      customer: b.customer || '—',
      designer: '—',
      builder: b.builder || '—',
      difficulty: 'II-toifa',
      floors: (b.floors && b.floors !== '0') ? String(b.floors).trim() : '—',
      apartment_count: b.apartment_count ? String(b.apartment_count).trim() : '0',
      area: (b.apartment_count && b.apartment_count !== '0') ? `${b.apartment_count} xonadon` : '—',
      block_count: '1',
      deadline: '—',
      created_at: b.created_at || '',
      task_id: '',
      passport_url: '',
      source_url: `https://dshk.shaffofqurilish.uz/object/${b.source_id}`,
      image_url: ''
    },
    internal: {
      tjm_name: '',
      phone: '',
      sales_office: '',
      manager_name: '',
      manager_phone: '',
      telegram: '',
      instagram: '',
      notes: 'Yangi haftalik monitoring orqali aniqlangan',
      priority: 'Yuqori',
      last_visit: '',
      visited_by: '',
      visit_lat_lng: ''
    }
  };
}

export function formatBuildingItemToMapObject(b: any): MapObject {
  const lat = parseFloat(b.latitude) || 39.6542;
  const lng = parseFloat(b.longitude) || 66.9597;
  const regSoato = String(b.region_soato || '1718');
  const regName = b.region_name || getRegionName(regSoato) || 'O\'zbekiston';
  const district = b.district_name || getDistrictName(String(b.district_soato || ''), regSoato) || regName;

  return {
    source_id: String(b.source_id),
    object_name: b.object_name || 'Yangi qurilish obyekti',
    tjm_name: '',
    latitude: lat,
    longitude: lng,
    status: 'Qurilish jarayonida',
    status_id: 1,
    region_soato: regSoato,
    region_name: regName,
    district_soato: b.district_soato || '',
    district_name: district,
    sphere_name: "Ko'p xonadonli uy-joylar",
    phone: '',
    sales_office: '',
    manager_name: '',
    manager_phone: '',
    floors: (b.floors && b.floors !== '0') ? String(b.floors).trim() : '—',
    apartment_count: b.apartment_count ? String(b.apartment_count).trim() : '0',
    area: (b.apartment_count && b.apartment_count !== '0') ? `${b.apartment_count} xonadon` : '—',
    image_url: '',
    has_internal: false,
    is_fully_filled: false,
    is_visited: false,
    last_visit: '',
    visited_by: '',
    builder: b.builder || '—',
    customer: b.customer || '—',
    address: b.address || '',
    deadline: '—',
    telegram: '',
    instagram: '',
    priority: 'Yuqori',
    notes: 'Yangi haftalik monitoring'
  };
}

export function formatMapObjectToObjectDetail(m: MapObject): ObjectDetail {
  const anyM = m as any;
  const lat = typeof m.latitude === 'number' ? m.latitude : parseFloat(String(m.latitude)) || 39.6542;
  const lng = typeof m.longitude === 'number' ? m.longitude : parseFloat(String(m.longitude)) || 66.9597;
  const regSoato = String(m.region_soato || (lat > 40.5 ? '1726' : '1718'));
  const regName = m.region_name || getRegionName(regSoato) || (lat > 40.5 ? 'Toshkent shahri' : 'Samarqand');
  const district = m.district_name || getDistrictName(String(m.district_soato || ''), regSoato) || regName;
  const isDomtut = String(m.source_id || '').startsWith('domtut_');

  return {
    source: {
      source_id: String(m.source_id || ''),
      object_name: String(m.object_name || m.tjm_name || "Noma'lum bino"),
      region_soato: regSoato,
      region_name: regName,
      district_soato: String(m.district_soato || '1718401'),
      district_name: district,
      address: String(m.address || m.sales_office || `${regName}`),
      latitude: lat,
      longitude: lng,
      status: String(m.status || 'Qurilish jarayonida'),
      status_id: m.status_id || 1,
      sphere_id: String(anyM.sphere_id || '57'),
      sphere_name: String(m.sphere_name || "Ko'p xonadonli uy-joylar"),
      customer: String(m.customer || '—'),
      designer: String(anyM.designer || '—'),
      builder: String(m.builder || '—'),
      difficulty: String(anyM.difficulty || 'II-toifa'),
      floors: String(m.floors || '—'),
      apartment_count: String(m.apartment_count || '0'),
      area: String(m.area || '—'),
      block_count: String(anyM.block_count || '1'),
      deadline: String(m.deadline || '—'),
      created_at: String(anyM.created_at || ''),
      task_id: String(anyM.task_id || ''),
      passport_url: String(anyM.passport_url || ''),
      source_url: String(anyM.source_url || (isDomtut ? 'https://domtut.uz' : `https://dshk.shaffofqurilish.uz/object/${m.source_id}`)),
      image_url: String(m.image_url || '')
    },
    internal: {
      tjm_name: String(m.tjm_name || '').trim(),
      phone: String(m.phone || '').trim(),
      sales_office: String(m.sales_office || '').trim(),
      manager_name: String(m.manager_name || '').trim(),
      manager_phone: String(m.manager_phone || '').trim(),
      telegram: String(m.telegram || '').trim(),
      instagram: String(m.instagram || '').trim(),
      notes: String(m.notes || '').trim(),
      priority: String(m.priority || '').trim(),
      last_visit: String(m.last_visit || '').trim(),
      visited_by: String(m.visited_by || '').trim(),
      visit_lat_lng: String(anyM.visit_lat_lng || '').trim()
    }
  };
}

export const api = {
  getMarkers: async (companyId?: string): Promise<MapObject[]> => {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
    const res = await fetchWithRetry(`/api/objects${q}`, { cache: 'no-store' });
    const json = await parseResponse(res);
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.error || "Obyektlarni yuklab bo'lmadi");
    }
    rememberCompanyDataSource(companyId, json.data_source);
    return json.data.map(formatRowToMapObject);
  },

  getObject: async (id: string, companyId?: string): Promise<ObjectDetail> => {
    const cleanId = String(id || '').trim();
    const q = `?id=${encodeURIComponent(cleanId)}&company_id=${encodeURIComponent(companyId || '')}&t=${Date.now()}`;
    const res = await fetchWithRetry(`/api/objects${q}`, { cache: 'no-store' });
    const json = await parseResponse(res);
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Obyekt topilmadi');
    }
    return formatRowToObjectDetail(json.data);
  },

  getObjectVisits: async (id: string, companyId?: string): Promise<{ visited_by: string; lat_lng: string; visited_at: string }[]> => {
    const q = `?source_id=${encodeURIComponent(id)}&company_id=${encodeURIComponent(companyId || '')}`;
    const json = await parseResponse(await fetch(`/api/objects/visit${q}`, { cache: 'no-store' }));
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  getSettings: async (): Promise<CustomField[]> => {
    try {
      const res = await fetch('/api/custom-fields', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Failed to load custom fields from API:', e);
    }
    return [
      { field_name: 'tjm_name', field_type: 'text', required: false, visible: true, column_letter: 'W' },
      { field_name: 'phone', field_type: 'phone', required: false, visible: true, column_letter: 'X' },
      { field_name: 'sales_office', field_type: 'text', required: false, visible: true, column_letter: 'Y' },
      { field_name: 'manager_name', field_type: 'text', required: false, visible: true, column_letter: 'Z' },
      { field_name: 'manager_phone', field_type: 'phone', required: false, visible: true, column_letter: 'AA' },
      { field_name: 'telegram', field_type: 'url', required: false, visible: true, column_letter: 'AB' },
      { field_name: 'instagram', field_type: 'url', required: false, visible: true, column_letter: 'AC' },
      { field_name: 'notes', field_type: 'textarea', required: false, visible: true, column_letter: 'AD' },
      { field_name: 'priority', field_type: 'select', required: false, visible: true, column_letter: 'AE' },
      { field_name: 'last_visit', field_type: 'date', required: false, visible: true, column_letter: 'AF' }
    ];
  },

  getStats: async (companyId?: string): Promise<DashboardStats> => {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
    const json = await parseResponse(await fetchWithRetry(`/api/objects${q}`, { cache: 'no-store' }));
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.error || "Statistikani yuklab bo'lmadi");
    }
    const rows: any[] = json.data;

    const total = rows.length;
    const with_internal = rows.filter((r: any) => String(r.tjm_name || r.phone || r.manager_name || '').trim().length > 0).length;
    const visited = rows.filter((r: any) => String(r.last_visit || '').trim().length > 0).length;
    const with_phone = rows.filter((r: any) => String(r.phone || '').trim().length > 0).length;
    const with_manager = rows.filter((r: any) => String(r.manager_name || '').trim().length > 0).length;

    return {
      total,
      with_internal,
      without_internal: total - with_internal,
      visited,
      not_visited: total - visited,
      with_phone,
      with_manager
    };
  },

  updateObject: async (id: string, data: Record<string, any>, user?: string, companyId?: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/objects/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: id, data, user, company_id: companyId, user_id: userId })
    });
    return parseResponse(res);
  },

  clearObject: async (id: string, user?: string, companyId?: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/objects/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: id, user, company_id: companyId, user_id: userId })
    });
    return parseResponse(res);
  },


  recordVisit: async (data: VisitData & { company_id?: string; user_id?: string }): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/objects/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  syncWithSheets: async (companyId?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
    const res = await fetchWithRetry(`/api/objects/sync${q}`, { method: 'POST' });
    return parseResponse(res);
  },

  createObject: async (data: Record<string, any>, user?: string, companyId?: string, userId?: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    const res = await fetch('/api/objects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user, company_id: companyId, user_id: userId })
    });
    return parseResponse(res);
  },

  getAllFields: async (): Promise<(CustomField & { label?: string; desc?: string })[]> => {
    const json = await parseResponse(await fetchWithRetry('/api/custom-fields?all=1', { cache: 'no-store' }));
    if (!json.success || !Array.isArray(json.data)) throw new Error(json.error || "Maydonlarni yuklab bo'lmadi");
    return json.data;
  },

  setFieldVisibility: async (fieldName: string, visible: boolean): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch('/api/custom-fields', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: fieldName, visible })
    });
    return parseResponse(res);
  },

  addCustomField: async (field: CustomField & { label?: string; desc?: string }): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field)
      });
      return parseResponse(res);
    } catch (e) {
      console.error('Failed to add custom field:', e);
      return { success: false, error: "Server bilan bog'lanib bo'lmadi" };
    }
  },

  // Auth & Admin Multi-Company Methods
  login: async (login: string, pass: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    const res = await fetchWithRetry('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password: pass })
    });
    try {
      // Not parseResponse: a wrong password is a 401 that must show its message, not redirect.
      return await res.json();
    } catch {
      return { success: false, error: `Server javobi noto'g'ri (${res.status})` };
    }
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(err => console.warn('Logout request failed:', err));
  },

  /** The signed-in user; null when the session is invalid, undefined when the server could not be reached. */
  getSessionUser: async (): Promise<any | null | undefined> => {
    try {
      const res = await fetchWithRetry('/api/auth/me', { cache: 'no-store' });
      if (res.status === 401) return null;
      const json = await res.json();
      return json.success ? json.user : undefined;
    } catch {
      return undefined;
    }
  },

  updateProfile: async (updates: Record<string, string>): Promise<{ success: boolean; user?: any; error?: string }> => {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return parseResponse(res);
  },

  getCompanies: async (): Promise<{ success: boolean; data: any[]; error?: string }> => {
    const res = await fetch('/api/admin/companies', { cache: 'no-store' });
    return parseResponse(res);
  },

  createCompany: async (name: string, status?: string, dataSource?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status, data_source: dataSource })
    });
    return parseResponse(res);
  },

  getUsers: async (): Promise<{ success: boolean; data: any[]; error?: string }> => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    return parseResponse(res);
  },

  createUser: async (user: { company_id: string; name: string; login: string; password: string; role: string }): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return parseResponse(res);
  },

  updateUser: async (userId: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates })
    });
    return parseResponse(res);
  },

  getDistricts: async () => {
    return Object.entries(SOATO_DISTRICT_MAP).map(([id, name]) => ({ id, name }));
  },

  // Saved routes
  saveRoute: async (routeData: Partial<SavedRoute> & { tjm_list?: string }): Promise<{ success: boolean; routeId?: string; data?: any; error?: string }> => {
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData)
    });
    return parseResponse(res);
  },

  getSavedRoutes: async (companyId?: string): Promise<{ success: boolean; data: SavedRoute[]; count?: number; error?: string }> => {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
    const res = await fetch(`/api/routes${q}`, { cache: 'no-store' });
    return parseResponse(res);
  },

  // Notifications and Weekly Sync
  getNotifications: async (): Promise<{ success: boolean; data: WeeklySyncNotification[]; count?: number; error?: string }> => {
    try {
      const res = await fetch(`/api/notifications?t=${Date.now()}`, { cache: 'no-store' });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, data: [], error: e.message };
    }
  },

  triggerWeeklySync: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/cron/weekly-sync', { method: 'POST' });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getUserSessions: async (limit: number = 100): Promise<{ success: boolean; data: UserSession[]; count?: number; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/sessions?limit=${limit}&t=${Date.now()}`, { cache: 'no-store' });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, data: [], error: e.message };
    }
  },

  triggerDomtutSync: async (limit: number = 80): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/admin/sync-domtut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit })
      });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getDomtutStats: async (): Promise<{ success: boolean; count?: number; last_updated?: string; districts_count?: number; districts?: string[]; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/sync-domtut?t=${Date.now()}`, { cache: 'no-store' });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Free AI Route Advisor & Smart Briefing
  getAIRoutePlan: async (params: {
    companyId?: string;
    userLat?: number;
    userLng?: number;
    prompt?: string;
    unvisitedOnly?: boolean;
    highPriorityOnly?: boolean;
    maxStops?: number;
    objects: MapObject[];
  }): Promise<{ success: boolean; data?: AIRoutePlanResult; error?: string }> => {
    try {
      const res = await fetch('/api/ai/route-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'plan_route',
          company_id: params.companyId,
          user_lat: params.userLat,
          user_lng: params.userLng,
          prompt: params.prompt,
          unvisited_only: params.unvisitedOnly,
          high_priority_only: params.highPriorityOnly,
          max_stops: params.maxStops || 5
        })
      });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getAIPitchBriefing: async (targetObject: any): Promise<{ success: boolean; data?: AIPitchBriefing; error?: string }> => {
    try {
      const res = await fetch('/api/ai/route-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pitch_briefing',
          target_object: targetObject
        })
      });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  askAIChat: async (params: {
    message: string;
    companyId?: string;
    userLat?: number | null;
    userLng?: number | null;
    objects?: any[];
  }): Promise<{
    success: boolean;
    data?: {
      text: string;
      suggested_objects?: AIChatMessage['suggested_objects'];
      route_stops?: AIChatMessage['route_stops'];
      actions?: AIChatAction[];
    };
    error?: string;
  }> => {
    try {
      const res = await fetch('/api/ai/route-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          company_id: params.companyId,
          message: params.message,
          user_lat: params.userLat,
          user_lng: params.userLng
        })
      });
      return parseResponse(res);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};


