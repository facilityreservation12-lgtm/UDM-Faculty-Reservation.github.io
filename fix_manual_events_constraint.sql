-- ===============================================
-- FIX MANUAL EVENTS FOREIGN KEY CONSTRAINT
-- ===============================================

-- First, let's check if the table exists and what constraints it has
-- Drop the existing foreign key constraint if it exists
ALTER TABLE manual_events DROP CONSTRAINT IF EXISTS manual_events_id_fkey;

-- If the table exists but has wrong structure, we need to fix it
-- Check if the table has the wrong primary key structure
DO $$
BEGIN
    -- Check if the table exists and has the wrong structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_events') THEN
        -- Check if the id column is not a serial
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'manual_events' 
            AND column_name = 'id' 
            AND data_type = 'integer'
            AND is_nullable = 'NO'
        ) THEN
            -- Drop and recreate the table with correct structure
            DROP TABLE IF EXISTS manual_events CASCADE;
            
            -- Create the table with correct structure
            CREATE TABLE manual_events (
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
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_manual_events_reserved_by ON manual_events(reserved_by);
            CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events(date);
            CREATE INDEX IF NOT EXISTS idx_manual_events_facility ON manual_events(facility);
            
            -- Grant permissions
            GRANT SELECT, INSERT, UPDATE, DELETE ON manual_events TO public;
            GRANT USAGE ON SEQUENCE manual_events_id_seq TO public;
            
            RAISE NOTICE 'Recreated manual_events table with correct structure';
        ELSE
            -- Table exists with correct structure, just drop the constraint
            RAISE NOTICE 'Table exists with correct structure, constraint dropped';
        END IF;
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE manual_events (
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
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_manual_events_reserved_by ON manual_events(reserved_by);
        CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events(date);
        CREATE INDEX IF NOT EXISTS idx_manual_events_facility ON manual_events(facility);
        
        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON manual_events TO public;
        GRANT USAGE ON SEQUENCE manual_events_id_seq TO public;
        
        RAISE NOTICE 'Created manual_events table';
    END IF;
END $$;

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_manual_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_manual_events_updated_at ON manual_events;
CREATE TRIGGER trigger_update_manual_events_updated_at
    BEFORE UPDATE ON manual_events
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_events_updated_at();

-- Add activity logging for manual events
CREATE OR REPLACE FUNCTION log_manual_events_activity()
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
        action_text := 'Created Manual Event';
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        action_text := 'Updated Manual Event';
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'Deleted Manual Event';
        
        INSERT INTO activity_logs (user_id, action, ip_address, created_at)
        VALUES (current_user_id, action_text, client_ip, NOW());
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Error in log_manual_events_activity: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manual_events table
DROP TRIGGER IF EXISTS trigger_log_manual_events_activity ON manual_events;
CREATE TRIGGER trigger_log_manual_events_activity
    AFTER INSERT OR UPDATE OR DELETE ON manual_events
    FOR EACH ROW
    EXECUTE FUNCTION log_manual_events_activity();

COMMENT ON TABLE manual_events IS 'Manual events created by users with auto-generated primary key';
COMMENT ON FUNCTION log_manual_events_activity() IS 'Triggers for logging manual events activities';
