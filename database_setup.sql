-- ===============================================
-- COMPREHENSIVE ROLE-BASED ACTIVITY LOGGING SYSTEM
-- ===============================================

-- Fix the tables first
-- Add updated_at column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Make request_id nullable in activity_logs if it's not already
ALTER TABLE activity_logs ALTER COLUMN request_id DROP NOT NULL;

-- First, let's create a function to get the current user's IP address
-- This will be used in our activity logging
CREATE OR REPLACE FUNCTION get_client_ip()
RETURNS INET AS $$
BEGIN
    -- Try to get IP from various sources
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

-- ===============================================
-- ACTIVITY LOGGING FOR USERS TABLE
-- ===============================================

-- Function to log user-related activities (WITHOUT AUTH)
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_text VARCHAR(50);
    current_user_id TEXT;
    client_ip INET;
BEGIN
    -- Get current user ID from session variable (set by application)
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true),
        'system'
    );
    
    -- Default IP address
    client_ip := '192.168.1.100'::INET;
    
    -- Determine action based on operation
    IF TG_OP = 'INSERT' THEN
        action_text := 'Created User Account';
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what was updated with more detailed logging
        IF OLD.role_name != NEW.role_name THEN
            action_text := 'Changed User Role: ' || COALESCE(OLD.role_name, 'null') || ' → ' || COALESCE(NEW.role_name, 'null');
        ELSIF OLD.first_name != NEW.first_name OR OLD.last_name != NEW.last_name THEN
            action_text := 'Updated Profile Name';
        ELSIF OLD.email != NEW.email THEN
            action_text := 'Changed Email Address';
        ELSIF OLD.password != NEW.password THEN
            action_text := 'Changed Password';
        ELSE
            action_text := 'Updated Profile';
        END IF;
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'Deleted User Account';
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Error in log_user_activity: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS trigger_log_user_activity ON users;
CREATE TRIGGER trigger_log_user_activity
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- ===============================================
-- ACTIVITY LOGGING FOR RESERVATIONS TABLE
-- ===============================================

-- Function to log reservation-related activities with role-based logic
CREATE OR REPLACE FUNCTION log_reservation_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_text VARCHAR(50);
    current_user_id TEXT;
    current_user_role TEXT;
    client_ip INET;
    reservation_owner_id TEXT;
BEGIN
    -- Get current user info (no auth system)
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true),
        'system'
    );
    
    -- Get current user's role
    SELECT role_name INTO current_user_role 
    FROM users 
    WHERE id = current_user_id;
    
    -- Get client IP
    client_ip := get_client_ip();
    
    -- Determine reservation owner
    reservation_owner_id := COALESCE(NEW.id, OLD.id);
    
    -- Role-based action logging
    IF TG_OP = 'INSERT' THEN
        -- Faculty and Student Organization: Adding reservations
        IF current_user_role IN ('faculty', 'student_organization') THEN
            action_text := 'Created Reservation Request';
        ELSE
            action_text := 'Added Reservation';
        END IF;
        
        -- Log for the user who created the reservation
        INSERT INTO activity_logs (user_id, request_id, action, ip_address, created_at)
        VALUES (current_user_id, NEW.request_id, action_text, client_ip, NOW());
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status change logging with role-based messages
        IF OLD.status != NEW.status THEN
            CASE 
                -- Super Admin and Admin role actions
                WHEN current_user_role IN ('super_admin', 'admin') THEN
                    CASE NEW.status
                        WHEN 'approved' THEN action_text := 'Approved Request';
                        WHEN 'rejected' THEN action_text := 'Rejected Request';
                        WHEN 'pending' THEN action_text := 'Set Request to Pending';
                        ELSE action_text := 'Updated Reservation Status';
                    END CASE;
                    
                -- Faculty and Student Organization role actions
                WHEN current_user_role IN ('faculty', 'student_organization') THEN
                    CASE NEW.status
                        WHEN 'cancelled' THEN action_text := 'Cancelled Own Reservation';
                        ELSE action_text := 'Updated Own Reservation';
                    END CASE;
                    
                ELSE
                    action_text := 'Updated Reservation';
            END CASE;
        ELSE
            -- Other updates
            action_text := 'Modified Reservation Details';
        END IF;
        
        -- Log the activity
        INSERT INTO activity_logs (user_id, request_id, action, ip_address, created_at)
        VALUES (current_user_id, NEW.request_id, action_text, client_ip, NOW());
        
        -- If status changed to approved/rejected, also log for reservation owner if different
        IF OLD.status != NEW.status 
           AND NEW.status IN ('approved', 'rejected') 
           AND current_user_id != reservation_owner_id THEN
            
            INSERT INTO activity_logs (user_id, request_id, action, ip_address, created_at)
            VALUES (reservation_owner_id, NEW.request_id, 
                   CASE NEW.status 
                       WHEN 'approved' THEN 'Request Approved'
                       WHEN 'rejected' THEN 'Request Rejected'
                   END, client_ip, NOW());
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Role-based deletion logging
        IF current_user_role IN ('faculty', 'student_organization') THEN
            action_text := 'Deleted Own Reservation';
        ELSIF current_user_role IN ('super_admin', 'admin') THEN
            action_text := 'Deleted User Reservation';
        ELSE
            action_text := 'Deleted Reservation';
        END IF;
        
        INSERT INTO activity_logs (user_id, request_id, action, ip_address, created_at)
        VALUES (current_user_id, OLD.request_id, action_text, client_ip, NOW());
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reservations table
DROP TRIGGER IF EXISTS trigger_log_reservation_activity ON reservations;
CREATE TRIGGER trigger_log_reservation_activity
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION log_reservation_activity();

-- ===============================================
-- NO RLS POLICIES (RLS NOT ENABLED)
-- ===============================================
-- Since you don't have RLS enabled, we'll skip all security policies
-- All users will have full access to all tables

-- ===============================================
-- HELPER FUNCTIONS FOR ROLE-BASED OPERATIONS
-- ===============================================

-- Function to check if current user has permission for action (no auth)
CREATE OR REPLACE FUNCTION check_user_permission(user_id_param TEXT, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role_name INTO user_role 
    FROM users 
    WHERE id = user_id_param;
    
    RETURN CASE required_role
        WHEN 'super_admin' THEN user_role = 'super_admin'
        WHEN 'admin' THEN user_role IN ('super_admin', 'admin')
        WHEN 'faculty' THEN user_role IN ('super_admin', 'admin', 'faculty')
        WHEN 'student_organization' THEN user_role IN ('super_admin', 'admin', 'student_organization')
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log authentication activities
CREATE OR REPLACE FUNCTION log_auth_activity(user_id_param TEXT, action_param TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, ip_address, created_at)
    VALUES (user_id_param, action_param, get_client_ip(), NOW());
EXCEPTION
    WHEN OTHERS THEN
        -- Silently handle errors to not break auth flow
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- ROLE-BASED CRUD FUNCTIONS
-- ===============================================

-- Function for Super Admin to create users
CREATE OR REPLACE FUNCTION create_user_as_admin(
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, user_id TEXT) AS $$
DECLARE
    new_user_id TEXT;
    current_user_role TEXT;
BEGIN
    -- Skip permission check since no auth system
    -- In a real app, you'd pass the current user ID as a parameter
    
    -- Validate role
    IF p_role NOT IN ('faculty', 'student_organization', 'admin', 'super_admin') THEN
        RETURN QUERY SELECT FALSE, 'Invalid role specified', NULL::TEXT;
        RETURN;
    END IF;
    
    -- Generate new user ID
    new_user_id := 'U' || LPAD(NEXTVAL('user_id_seq')::TEXT, 3, '0');
    
    -- Create user
    INSERT INTO users (id, first_name, last_name, email, password, role_name)
    VALUES (new_user_id, p_first_name, p_last_name, p_email, p_password, p_role);
    
    -- Log the activity
    INSERT INTO activity_logs (user_id, action, ip_address)
    VALUES ('system', 'Created User: ' || p_first_name || ' ' || p_last_name, get_client_ip());
    
    RETURN QUERY SELECT TRUE, 'User created successfully', new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for role-based reservation creation (no auth)
CREATE OR REPLACE FUNCTION create_reservation(
    p_user_id TEXT,
    p_facility TEXT,
    p_date DATE,
    p_time_start TIME,
    p_time_end TIME,
    p_title TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, request_id TEXT) AS $$
DECLARE
    new_request_id TEXT;
    user_role TEXT;
BEGIN
    -- Get user role
    SELECT role_name INTO user_role FROM users WHERE id = p_user_id;
    
    -- Check if user can create reservations
    IF user_role NOT IN ('faculty', 'student_organization') THEN
        RETURN QUERY SELECT FALSE, 'Only faculty and student organizations can create reservations', NULL::TEXT;
        RETURN;
    END IF;
    
    -- Generate request ID
    new_request_id := 'REQ' || LPAD(NEXTVAL('request_id_seq')::TEXT, 3, '0');
    
    -- Create reservation
    INSERT INTO reservations (
        request_id, id, facility, date, time_start, time_end, 
        title_of_the_event, description, status
    )
    VALUES (
        new_request_id, p_user_id, p_facility, p_date, p_time_start, p_time_end,
        p_title, p_description, 'request'
    );
    
    RETURN QUERY SELECT TRUE, 'Reservation request created successfully', new_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- SEQUENCES FOR ID GENERATION
-- ===============================================

-- Create sequences if they don't exist
CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS request_id_seq START 1;

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Indexes for activity_logs table
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_request_id ON activity_logs(request_id);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_role_name ON users(role_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Indexes for reservations table
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

-- ===============================================
-- SAMPLE DATA INSERTION (OPTIONAL)
-- ===============================================

-- Insert sample activity logs for testing
-- (Only run this if you want test data)
/*
INSERT INTO activity_logs (user_id, action, ip_address) VALUES 
('A001', 'Log in', '192.168.1.100'),
('A001', 'View Dashboard', '192.168.1.100'),
('A001', 'View Activity Logs', '192.168.1.100'),
('A001', 'Created User Account', '192.168.1.100'),
('A001', 'Approved Request', '192.168.1.100'),
('A001', 'Log out', '192.168.1.100');
*/

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

-- Grant necessary permissions (no auth system)
GRANT USAGE ON SEQUENCE user_id_seq TO public;
GRANT USAGE ON SEQUENCE request_id_seq TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservations TO public;

-- Manual logging function for frontend use
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

-- Grant execute permissions on functions (no auth)
GRANT EXECUTE ON FUNCTION check_user_permission(TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION log_auth_activity(TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION create_user_as_admin(TEXT, TEXT, TEXT, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION create_reservation(TEXT, TEXT, DATE, TIME, TIME, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO public;

COMMENT ON TABLE activity_logs IS 'Comprehensive activity logging with role-based permissions';
COMMENT ON FUNCTION log_user_activity() IS 'Triggers for logging user table activities';
COMMENT ON FUNCTION log_reservation_activity() IS 'Triggers for logging reservation activities with role-based logic';
COMMENT ON FUNCTION check_user_permission(TEXT) IS 'Helper function to check user permissions based on role';