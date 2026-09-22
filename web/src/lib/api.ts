import { MapObject, ObjectDetail, CustomField, DashboardStats, VisitData, SavedRoute, WeeklySyncNotification } from './types';
import realSheetsData from './real-sheets-data.json';
import { getRegionName, getDistrictName, getRegionBySoato } from './regions';

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
  const lat = parseFloat(r.latitude) || 39.6542;
  const lng = parseFloat(r.longitude) || 66.9597;
  const regSoato = String(r.region_soato || (r.district_soato ? String(r.district_soato).substring(0, 4) : '1718'));
  const regName = getRegionName(regSoato);
  const district = getDistrictName(String(r.district_soato || ''), regSoato) || SOATO_DISTRICT_MAP[r.district_soato] || (r.district_soato ? `Tuman (${r.district_soato})` : regName);

  const tjm = (r.tjm_name || '').trim();
  const phone = (r.phone || '').trim();
  const manager = (r.manager_name || '').trim();
  const salesOffice = (r.sales_office || '').trim();
  const lastVisit = (r.last_visit || '').trim();

  const hasInternal = Boolean(tjm || phone || manager || salesOffice);
  const isFullyFilled = Boolean(tjm && phone && manager);
  const isVisited = Boolean(lastVisit);

  return {
    source_id: String(r.source_id),
    object_name: r.object_name || 'Qurilish obyekti',
    tjm_name: tjm,
    latitude: lat,
    longitude: lng,
    status: r.status || 'Qurilish jarayonida',
    status_id: parseInt(r.status_id) || 1,
    region_soato: regSoato,
    region_name: regName,
    district_soato: r.district_soato || '1718401',
    district_name: district,
    sphere_name: "Ko'p xonadonli uy-joylar",
    phone: phone,
    sales_office: salesOffice,
    manager_name: manager,
    manager_phone: (r.manager_phone || '').trim(),
    floors: (r.floors && r.floors !== '0') ? String(r.floors).trim() : '—',
    apartment_count: r.apartment_count ? String(r.apartment_count).trim() : '0',
    area: (r.apartment_count && r.apartment_count !== '0') ? `${r.apartment_count} xonadon` : '—',
    image_url: r.image_url || '',
    has_internal: hasInternal,
    is_fully_filled: isFullyFilled,
    is_visited: isVisited,
    last_visit: lastVisit,
    visited_by: (r.visited_by || '').trim(),
    builder: (r.builder || '').trim(),
    customer: (r.customer || '').trim(),
    address: (r.address || '').trim(),
    deadline: (r.deadline || '').trim(),
    telegram: (r.telegram || '').trim(),
    instagram: (r.instagram || '').trim(),
    priority: (r.priority || '').trim(),
    notes: (r.notes || '').trim()
  };
}

function formatRowToObjectDetail(r: any): ObjectDetail {
  const lat = parseFloat(r.latitude) || 39.6542;
  const lng = parseFloat(r.longitude) || 66.9597;
  const regSoato = String(r.region_soato || (r.district_soato ? String(r.district_soato).substring(0, 4) : '1718'));
  const regName = getRegionName(regSoato);
  const district = getDistrictName(String(r.district_soato || ''), regSoato) || SOATO_DISTRICT_MAP[r.district_soato] || (r.district_soato ? `Tuman (${r.district_soato})` : regName);

  return {
    source: {
      source_id: String(r.source_id),
      object_name: r.object_name || '',
      region_soato: regSoato,
      region_name: regName,
      district_soato: r.district_soato || '1718401',
      district_name: district,
      address: r.address || `${regName}`,
      latitude: lat,
      longitude: lng,
      status: r.status || 'Qurilish jarayonida',
      status_id: parseInt(r.status_id) || 1,
      sphere_id: r.sphere_id || '57',
      sphere_name: "Ko'p xonadonli uy-joylar",
      customer: r.customer || '—',
      designer: r.designer || '—',
      builder: r.builder || '—',
      difficulty: r.difficulty ? `${r.difficulty}-toifa` : 'II-toifa',
      floors: (r.floors && r.floors !== '0') ? String(r.floors).trim() : '—',
      apartment_count: r.apartment_count ? String(r.apartment_count).trim() : '0',
      area: (r.apartment_count && r.apartment_count !== '0') ? `${r.apartment_count} xonadon` : '—',
      block_count: r.block_count || '1',
      deadline: r.deadline || '—',
      created_at: r.created_at || '',
      task_id: r.task_id || '',
      passport_url: r.passport_url || '',
      source_url: r.source_url || `https://dshk.shaffofqurilish.uz/object/${r.source_id}`,
      image_url: r.image_url || ''
    },
    internal: {
      tjm_name: (r.tjm_name || '').trim(),
      phone: (r.phone || '').trim(),
      sales_office: (r.sales_office || '').trim(),
      manager_name: (r.manager_name || '').trim(),
      manager_phone: (r.manager_phone || '').trim(),
      telegram: (r.telegram || '').trim(),
      instagram: (r.instagram || '').trim(),
      notes: (r.notes || '').trim(),
      priority: (r.priority || '').trim(),
      last_visit: (r.last_visit || '').trim(),
      visited_by: (r.visited_by || '').trim(),
      visit_lat_lng: (r.visit_lat_lng || '').trim()
    }
  };
}

export const api = {
  getMarkers: async (companyId?: string): Promise<MapObject[]> => {
    try {
      const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
      const res = await fetch(`/api/objects${q}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.map(formatRowToMapObject);
        }
      }
    } catch (e) {
      console.warn('Using fallback data:', e);
    }
    return (realSheetsData.rows as any[]).map(formatRowToMapObject);
  },

  getObject: async (id: string, companyId?: string): Promise<ObjectDetail> => {
    let rows = realSheetsData.rows as any[];
    try {
      const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
      const res = await fetch(`/api/objects${q}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          rows = json.data;
        }
      }
    } catch (e) {}

    const idx = rows.findIndex((r: any) => String(r.source_id).trim() === String(id).trim());
    if (idx !== -1) {
      return formatRowToObjectDetail(rows[idx]);
    }
    return formatRowToObjectDetail(rows[0]);
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
    let rows = realSheetsData.rows as any[];
    try {
      const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
      const res = await fetch(`/api/objects${q}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) rows = json.data;
      }
    } catch (e) {}

    const total = rows.length;
    const with_internal = rows.filter((r: any) => (r.tjm_name || r.phone || r.manager_name || '').trim()).length;
    const visited = rows.filter((r: any) => (r.last_visit || '').trim()).length;
    const with_phone = rows.filter((r: any) => (r.phone || '').trim()).length;
    const with_manager = rows.filter((r: any) => (r.manager_name || '').trim()).length;

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
    return await res.json();
  },

  clearObject: async (id: string, user?: string, companyId?: string, userId?: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/objects/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: id, user, company_id: companyId, user_id: userId })
    });
    return await res.json();
  },


  recordVisit: async (data: VisitData & { company_id?: string; user_id?: string }): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/objects/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  syncWithSheets: async (): Promise<{ success: boolean; count?: number; data?: any[] }> => {
    const res = await fetch('/api/objects/sync', { method: 'POST' });
    return await res.json();
  },

  createObject: async (data: Record<string, any>, user?: string, companyId?: string, userId?: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    const res = await fetch('/api/objects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user, company_id: companyId, user_id: userId })
    });
    return await res.json();
  },

  addCustomField: async (field: CustomField & { label?: string; desc?: string }): Promise<{ success: boolean; data?: any }> => {
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field)
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to add custom field:', e);
      return { success: false };
    }
  },

  // Auth & Admin Multi-Company Methods
  login: async (login: string, pass: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password: pass })
    });
    return await res.json();
  },

  getCompanies: async (): Promise<{ success: boolean; data: any[]; error?: string }> => {
    const res = await fetch('/api/admin/companies', { cache: 'no-store' });
    return await res.json();
  },

  createCompany: async (name: string, status?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status })
    });
    return await res.json();
  },

  getUsers: async (): Promise<{ success: boolean; data: any[]; error?: string }> => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    return await res.json();
  },

  createUser: async (user: { company_id: string; name: string; login: string; password: string; role: string }): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return await res.json();
  },

  getDistricts: async () => {
    return Object.entries(SOATO_DISTRICT_MAP).map(([id, name]) => ({ id, name }));
  },

  // Routes Management in Google Sheets
  saveRoute: async (routeData: Partial<SavedRoute> & { tjm_list?: string }): Promise<{ success: boolean; routeId?: string; data?: any; error?: string }> => {
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData)
    });
    return await res.json();
  },

  getSavedRoutes: async (companyId?: string): Promise<{ success: boolean; data: SavedRoute[]; count?: number; error?: string }> => {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}&t=${Date.now()}` : `?t=${Date.now()}`;
    const res = await fetch(`/api/routes${q}`, { cache: 'no-store' });
    return await res.json();
  },

  // Notifications and Weekly Sync
  getNotifications: async (): Promise<{ success: boolean; data: WeeklySyncNotification[]; count?: number; error?: string }> => {
    try {
      const res = await fetch(`/api/notifications?t=${Date.now()}`, { cache: 'no-store' });
      return await res.json();
    } catch (e: any) {
      return { success: false, data: [], error: e.message };
    }
  },

  triggerWeeklySync: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/cron/weekly-sync', { method: 'POST' });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};


