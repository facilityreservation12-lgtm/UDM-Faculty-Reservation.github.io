-- ===============================================
-- UDM FACULTY RESERVATION SYSTEM - DATABASE SETUP
-- Complete schema for new Supabase project
-- ===============================================

-- ===============================================
-- STEP 1: CREATE SEQUENCES FOR ID GENERATION
-- ===============================================
CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS request_id_seq START 1;

-- ===============================================
-- STEP 2: CREATE USERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_name TEXT NOT NULL CHECK (role_name IN ('super_admin', 'admin', 'faculty', 'student_organization')),
    role TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- STEP 3: CREATE RESERVATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS reservations (
    request_id TEXT PRIMARY KEY,
    id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility TEXT NOT NULL,
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    title_of_the_event TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'request' CHECK (status IN ('request', 'pending', 'approved', 'rejected', 'cancelled')),
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- STEP 4: CREATE ACTIVITY_LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    request_id TEXT,
    action TEXT NOT NULL,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- STEP 5: CREATE MANUAL_EVENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS manual_events (
    id SERIAL PRIMARY KEY,
    facility TEXT NOT NULL,
    date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    title_of_the_event TEXT NOT NULL,
    reserved_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ===============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role_name ON users(role_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Reservations indexes
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_facility ON reservations(facility);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_request_id ON activity_logs(request_id);

-- Manual events indexes
CREATE INDEX IF NOT EXISTS idx_manual_events_reserved_by ON manual_events(reserved_by);
CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events(date);
CREATE INDEX IF NOT EXISTS idx_manual_events_facility ON manual_events(facility);

-- ===============================================
-- STEP 7: GRANT PERMISSIONS TO PUBLIC
-- ===============================================
GRANT USAGE ON SEQUENCE user_id_seq TO public;
GRANT USAGE ON SEQUENCE request_id_seq TO public;
GRANT USAGE ON SEQUENCE manual_events_id_seq TO public;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservations TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON manual_events TO public;

-- ===============================================
-- STEP 8: HELPER FUNCTIONS
-- ===============================================

-- Function to get client IP address
CREATE OR REPLACE FUNCTION get_client_ip()
RETURNS INET AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'x-real-ip',
        '127.0.0.1'
    )::INET;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '127.0.0.1'::INET;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual activity logging function
CREATE OR REPLACE FUNCTION manual_log_activity(
    p_user_id TEXT,
    p_action TEXT,
    p_ip_address TEXT DEFAULT '192.168.1.100'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, ip_address, created_at)
    VALUES (p_user_id, p_action, p_ip_address::INET, NOW());
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in manual_log_activity: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Simple logging function
CREATE OR REPLACE FUNCTION simple_log(
    user_id_param TEXT,
    action_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, ip_address, created_at)
    VALUES (user_id_param, action_param, '192.168.1.100'::INET, NOW());
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_client_ip() TO public;
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION simple_log(TEXT, TEXT) TO public;

-- ===============================================
-- STEP 9: CREATE INITIAL ADMIN ACCOUNT
-- ===============================================
-- Default admin credentials (change password after first login)
INSERT INTO users (id, first_name, last_name, email, password, role_name)
VALUES ('A001', 'Admin', 'User', 'admin@udm.edu.ph', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Default super admin credentials (change password after first login)
INSERT INTO users (id, first_name, last_name, email, password, role_name)
VALUES ('SA001', 'Super', 'Admin', 'superadmin@udm.edu.ph', 'superadmin123', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ===============================================
-- VERIFICATION QUERIES (run these to verify setup)
-- ===============================================
-- SELECT * FROM users;
-- SELECT * FROM reservations LIMIT 5;
-- SELECT * FROM activity_logs LIMIT 5;
-- SELECT * FROM manual_events LIMIT 5;
