-- ===============================================
-- SIMPLE ACTIVITY LOGGING - NO AUTH, USES id COLUMN
-- ===============================================

-- Fix the tables first
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE activity_logs ALTER COLUMN request_id DROP NOT NULL;

-- Simple manual logging function (main function to use)
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

-- Simple trigger function for users table (focuses on role changes)
CREATE OR REPLACE FUNCTION log_user_activity_simple()
RETURNS TRIGGER AS $$
DECLARE
    action_text TEXT;
    current_user_id TEXT;
BEGIN
    -- Use a default user for system operations
    current_user_id := 'system';
    
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role_name != NEW.role_name THEN
            action_text := 'Changed User Role: ' || COALESCE(OLD.role_name, 'null') || ' → ' || COALESCE(NEW.role_name, 'null');
            
            INSERT INTO activity_logs (user_id, action, ip_address, created_at)
            VALUES (current_user_id, action_text, '192.168.1.100'::INET, NOW());
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the original operation
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_log_user_activity ON users;
DROP TRIGGER IF EXISTS trigger_log_user_activity_simple ON users;

CREATE TRIGGER trigger_log_user_activity_simple
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity_simple();

-- Grant permissions to everyone (no auth)
GRANT ALL ON activity_logs TO public;
GRANT ALL ON users TO public;
GRANT ALL ON reservations TO public;
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO public;

-- Insert test data to verify it works
INSERT INTO activity_logs (user_id, action, ip_address) VALUES 
('system', 'Database Setup Complete', '192.168.1.100')
ON CONFLICT DO NOTHING;

-- Test the function
SELECT manual_log_activity('test_user', 'Function Test', '192.168.1.100');