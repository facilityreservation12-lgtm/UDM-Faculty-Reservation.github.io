-- ============================================
-- Supabase Auth Direct - Database Setup
-- ============================================
-- This migration sets up the database for Supabase Auth Direct approach
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow anyone to read users (for login lookup)
-- This is needed for the login flow to look up user by email
DROP POLICY IF EXISTS "Anyone can read users for login" ON users;
CREATE POLICY "Anyone can read users for login" 
ON users FOR SELECT 
USING (true);

-- 3. Create policy to allow authenticated users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid()::text = id);

-- 4. Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- IMPORTANT: After running this SQL, you must:
-- ============================================
-- 1. Run the user migration script:
--    node scripts/migrateUsersToSupabaseAuth.js
--    This creates Supabase Auth accounts for all existing users
--
-- 2. Configure Supabase Dashboard:
--    - Go to Authentication → Settings
--    - Set Site URL to your GitHub Pages URL
--    - Set Redirect URLs to include your reset-password.html URL
--
-- 3. Email Templates (Authentication → Email Templates):
--    - Password Reset template should have:
--      {{ .ConfirmationURL }}
--    - Make sure the reset URL points to your reset-password.html
-- ============================================

-- Verification queries (optional):
-- SELECT id, email, role_name FROM users LIMIT 10;
-- SELECT COUNT(*) as total_users FROM users;
