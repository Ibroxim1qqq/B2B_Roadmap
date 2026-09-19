export interface MapObject {
  source_id: string;
  object_name: string;
  latitude: number;
  longitude: number;
  status: string;
  status_id: number;
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
  column_letter: string;
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

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  phone?: string;
  avatarInitials: string;
}
