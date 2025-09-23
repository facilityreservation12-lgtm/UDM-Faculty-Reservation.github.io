-- ===============================================
-- SIMPLIFIED TRIGGER FIX FOR USER ROLE CHANGES
-- ===============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_user_activity ON users;

-- Create a simpler, more reliable trigger function
CREATE OR REPLACE FUNCTION log_user_activity_simple()
RETURNS TRIGGER AS $$
DECLARE
    action_text VARCHAR(50);
    current_user_id TEXT;
    client_ip INET;
BEGIN
    -- Get current user ID (fallback to 'system' if not available)
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true),
        'system'
    );
    
    -- Default IP
    client_ip := '192.168.1.100'::INET;
    
    -- Determine action based on operation
    IF TG_OP = 'INSERT' THEN
        action_text := 'Created User Account';
        INSERT INTO activity_logs (user_id, action, ip_address)
        VALUES (current_user_id, action_text, client_ip);
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what was updated
        IF OLD.role_name != NEW.role_name THEN
            action_text := 'Changed User Role: ' || OLD.role_name || ' → ' || NEW.role_name;
        ELSIF OLD.first_name != NEW.first_name OR OLD.last_name != NEW.last_name THEN
            action_text := 'Updated Profile Name';
        ELSIF OLD.email != NEW.email THEN
            action_text := 'Changed Email Address';
        ELSE
            action_text := 'Updated Profile';
        END IF;
        
        INSERT INTO activity_logs (user_id, action, ip_address)
        VALUES (current_user_id, action_text, client_ip);
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'Deleted User Account';
        INSERT INTO activity_logs (user_id, action, ip_address)
        VALUES (current_user_id, action_text, client_ip);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and continue
        RAISE WARNING 'Error in log_user_activity_simple: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_log_user_activity_simple
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity_simple();

-- Test the trigger by running this:
-- UPDATE users SET role_name = role_name WHERE id = 'A001';

-- Alternative: Manual logging function that you can call from your frontend
CREATE OR REPLACE FUNCTION manual_log_activity(
    p_user_id TEXT,
    p_action TEXT,
    p_ip_address TEXT DEFAULT '192.168.1.100'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, ip_address)
    VALUES (p_user_id, p_action, p_ip_address::INET);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in manual_log_activity: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION manual_log_activity(TEXT, TEXT, TEXT) TO authenticated;