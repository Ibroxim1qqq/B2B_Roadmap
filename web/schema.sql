-- ============================================================================
-- B2B Samarqand & UYSOT Construction Platform - Neon PostgreSQL Schema
-- Database: PostgreSQL 15+ / Neon Serverless Postgres
-- ============================================================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    data_source VARCHAR(50) DEFAULT 'dshk',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'manager',
    company_id VARCHAR(100) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    avatar_initials VARCHAR(10) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OBJECTS TABLE (Main Building & Construction Registry)
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(100) UNIQUE NOT NULL,
    object_name TEXT NOT NULL,
    region_soato VARCHAR(20) DEFAULT '1718',
    region_name VARCHAR(100) DEFAULT '',
    district_soato VARCHAR(20) DEFAULT '',
    district_name VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    status VARCHAR(100) DEFAULT 'Qurilish jarayonida',
    status_id INT DEFAULT 1,
    sphere_id VARCHAR(50) DEFAULT '57',
    sphere_name VARCHAR(100) DEFAULT 'Ko''p xonadonli uy-joylar',
    customer TEXT DEFAULT '—',
    designer TEXT DEFAULT '—',
    builder TEXT DEFAULT '—',
    difficulty VARCHAR(50) DEFAULT 'II-toifa',
    floors VARCHAR(50) DEFAULT '—',
    apartment_count VARCHAR(50) DEFAULT '0',
    block_count VARCHAR(50) DEFAULT '1',
    deadline VARCHAR(100) DEFAULT '—',
    created_at VARCHAR(100) DEFAULT '',
    task_id VARCHAR(100) DEFAULT '',
    passport_url TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_uysot BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMPANY_DATA TABLE (Isolated Multi-Tenant CRM Overrides & Custom TJMs)
CREATE TABLE IF NOT EXISTS company_data (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) DEFAULT '',
    source_id VARCHAR(100) NOT NULL,
    tjm_name VARCHAR(255) DEFAULT '',
    phone VARCHAR(100) DEFAULT '',
    sales_office TEXT DEFAULT '',
    manager_name VARCHAR(255) DEFAULT '',
    manager_phone VARCHAR(100) DEFAULT '',
    telegram VARCHAR(100) DEFAULT '',
    instagram VARCHAR(100) DEFAULT '',
    notes TEXT DEFAULT '',
    priority VARCHAR(50) DEFAULT 'Normal',
    last_visit VARCHAR(100) DEFAULT '',
    visited_by VARCHAR(255) DEFAULT '',
    visit_lat_lng VARCHAR(100) DEFAULT '',
    is_custom_tjm BOOLEAN DEFAULT FALSE,
    custom_object_json JSONB DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_company_source UNIQUE (company_id, source_id)
);

-- 5. ROUTES TABLE (Saved Navigator Routes)
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(100) UNIQUE NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) DEFAULT '',
    user_name VARCHAR(255) DEFAULT '',
    route_name VARCHAR(255) NOT NULL,
    start_name VARCHAR(255) NOT NULL,
    start_lat NUMERIC(10, 6) NOT NULL,
    start_lng NUMERIC(10, 6) NOT NULL,
    end_name VARCHAR(255) NOT NULL,
    end_lat NUMERIC(10, 6) NOT NULL,
    end_lng NUMERIC(10, 6) NOT NULL,
    distance_km NUMERIC(10, 2) DEFAULT 0,
    duration_min NUMERIC(10, 2) DEFAULT 0,
    tjm_count INT DEFAULT 0,
    tjm_list TEXT DEFAULT '',
    buffer_radius_m INT DEFAULT 200,
    notes TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NOTIFICATIONS TABLE (Weekly Sync & System Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notif_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT DEFAULT '',
    sync_date VARCHAR(50) NOT NULL,
    new_count INT DEFAULT 0,
    by_region_json JSONB DEFAULT '{}',
    new_objects_json JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER_SESSIONS TABLE (Audit Log & Login History)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    login VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_id VARCHAR(100) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100) DEFAULT '',
    user_agent TEXT DEFAULT '',
    timestamp VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CUSTOM_FIELDS TABLE (Dynamic CRM Fields)
CREATE TABLE IF NOT EXISTS custom_fields (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(100) UNIQUE NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    column_letter VARCHAR(10) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVITY_LOG TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) DEFAULT '',
    object_name VARCHAR(255) DEFAULT '',
    user_info VARCHAR(255) DEFAULT '',
    details TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_objects_source_id ON objects(source_id);
CREATE INDEX IF NOT EXISTS idx_objects_region ON objects(region_soato);
CREATE INDEX IF NOT EXISTS idx_objects_is_uysot ON objects(is_uysot);
CREATE INDEX IF NOT EXISTS idx_company_data_cid_sid ON company_data(company_id, source_id);
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- DEFAULT SYSTEM PROVISIONS
-- ============================================================================
INSERT INTO companies (company_id, company_name, status, data_source)
VALUES 
    ('comp_default', 'Asosiy Kompaniya', 'active', 'dshk'),
    ('comp_samarqand', 'Samarqand B2B Stroy', 'active', 'dshk'),
    ('uysot', 'UYSOT.UZ', 'active', 'domtut')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO users (user_id, name, login, password_hash, role, company_id, phone, avatar_initials)
VALUES
    ('user_admin', 'Super Administrator', 'admin', 'admin123', 'superadmin', 'system', '+998 90 000 00 01', 'SA'),
    ('user_ibroxim', 'Ibroxim Toirov', 'ibroxim', 'ibroxim2026', 'company_admin', 'comp_default', '+998 90 123 45 67', 'IT'),
    ('user_nilufar', 'Nilufar', 'nilufar', 'uysot2026', 'company_admin', 'uysot', '+998 90 999 88 77', 'N'),
    ('user_mgr1', 'Alisher Karimov', 'menejer1', '123456', 'manager', 'comp_default', '+998 91 234 56 78', 'AK')
ON CONFLICT (login) DO NOTHING;
