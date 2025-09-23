-- ===============================================
-- QUICK FIX FOR ACTIVITY LOGGING ISSUES
-- ===============================================

-- Fix 1: Add updated_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Fix 2: Make request_id nullable in activity_logs
ALTER TABLE activity_logs ALTER COLUMN request_id DROP NOT NULL;

-- Fix 3: Create the manual_log_activity function
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

-- Fix 4: Recreate the user activity trigger (simplified)
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_text VARCHAR(100);
    current_user_id TEXT;
BEGIN
    -- Get current user ID from session variable (set by application)
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true),
        'system'
    );
    
    -- Determine action based on operation
    IF TG_OP = 'INSERT' THEN
        action_text := 'Created User Account';
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what was updated with more detailed logging
        IF OLD.role_name != NEW.role_name THEN
            action_text := 'Changed User Role: ' || COALESCE(OLD.role_name, 'null') || ' → ' || COALESCE(NEW.role_name, 'null');
        ELSIF OLD.first_name != NEW.first_name OR OLD.last_name != NEW.last_name THEN
            action_text := 'Updated Profile Name';
        ELSIF OLD.email != NEW.email THEN
            action_text := 'Changed Email Address';
        ELSE
            action_text := 'Updated Profile';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'Deleted User Account';
    END IF;
    
    -- Insert the log entry
    INSERT INTO activity_logs (user_id, action, ip_address, created_at)
    VALUES (current_user_id, action_text, '192.168.1.100'::INET, NOW());
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Error in log_user_activity: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_log_user_activity ON users;
CREATE TRIGGER trigger_log_user_activity
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Fix 5: Grant permissions
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO public;

-- Fix 6: Insert some test data to verify everything works
INSERT INTO activity_logs (user_id, action, ip_address) VALUES 
('S001', 'Test Log Entry', '192.168.1.100'),
('S001', 'Manual Function Test', '192.168.1.100')
ON CONFLICT DO NOTHING;

-- Test the manual function
SELECT manual_log_activity('S001', 'Database Setup Complete', '192.168.1.100');

-- Verify the data
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;