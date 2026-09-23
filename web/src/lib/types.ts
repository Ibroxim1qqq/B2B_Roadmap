export interface MapObject {
  source_id: string;
  object_name: string;
  latitude: number;
  longitude: number;
  status: string;
  status_id: number;
  region_soato?: string;
  region_name?: string;
  district_soato: string;
  district_name?: string;
  sphere_name?: string;
  tjm_name?: string;
  phone?: string;
  sales_office?: string;
  manager_name?: string;
  manager_phone?: string;
  floors?: string;
  apartment_count?: string;
  area?: string;
  image_url?: string;
  has_internal?: boolean;
  is_fully_filled?: boolean;
  is_visited?: boolean;
  last_visit?: string;
  visited_by?: string;
  builder?: string;
  customer?: string;
  address?: string;
  deadline?: string;
  telegram?: string;
  instagram?: string;
  priority?: string;
  notes?: string;
  distance?: number;
}

export interface ObjectDetail {
  source: {
    source_id: string;
    object_name: string;
    region_soato: string;
    region_name?: string;
    district_soato: string;
    district_name?: string;
    address: string;
    latitude: number;
    longitude: number;
    status: string;
    status_id: number;
    sphere_id: string;
    sphere_name?: string;
    customer: string;
    designer: string;
    builder: string;
    difficulty: string;
    floors: string;
    apartment_count: string;
    area?: string;
    block_count: string;
    deadline: string;
    created_at: string;
    task_id: string;
    passport_url: string;
    source_url: string;
    image_url?: string;
  };
  internal: {
    tjm_name?: string;
    phone?: string;
    sales_office?: string;
    manager_name?: string;
    manager_phone?: string;
    telegram?: string;
    instagram?: string;
    notes?: string;
    last_visit?: string;
    visited_by?: string;
    visit_lat_lng?: string;
    priority?: string;
    [key: string]: any;
  };
}

export interface CustomField {
  field_name: string;
  field_type: 'text' | 'phone' | 'number' | 'date' | 'url' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  visible: boolean;
  column_letter?: string;
}

export interface DashboardStats {
  total: number;
  with_internal: number;
  without_internal: number;
  visited: number;
  not_visited: number;
  with_phone: number;
  with_manager: number;
}

export interface VisitData {
  source_id: string;
  visited_by: string;
  lat_lng?: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  status: 'active' | 'inactive';
  created_at: string;
  user_count?: number;
  data_count?: number;
}

export interface UserProfile {
  id: string;
  user_id?: string;
  name: string;
  role: 'superadmin' | 'company_admin' | 'manager' | string;
  phone?: string;
  avatarInitials: string;
  company_id?: string;
  company_name?: string;
  login?: string;
}

export interface SavedRoute {
  id: string;
  company_id: string;
  user_id?: string;
  user_name?: string;
  start_name: string;
  start_lat: number;
  start_lng: number;
  end_name: string;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  duration_min: number;
  tjm_count: number;
  tjm_list: string;
  buffer_radius_m: number;
  notes?: string;
  status?: string;
  created_at: string;
}

export interface NewBuildingItem {
  source_id: string;
  object_name: string;
  region_soato: string;
  region_name?: string;
  district_soato: string;
  district_name?: string;
  address: string;
  latitude: number;
  longitude: number;
  floors?: string;
  apartment_count?: string;
  customer?: string;
  builder?: string;
  created_at?: string;
}

export interface WeeklySyncNotification {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  new_count: number;
  by_region: Record<string, number>;
  new_objects: NewBuildingItem[];
  is_read?: boolean;
}

export interface UserSession {
  session_id: string;
  user_id: string;
  user_name: string;
  login: string;
  role: string;
  company_id: string;
  company_name: string;
  action: 'login' | 'register' | 'logout';
  ip_address: string;
  user_agent: string;
  timestamp: string;
  created_at: string;
}



