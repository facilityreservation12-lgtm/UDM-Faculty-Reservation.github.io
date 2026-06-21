-- Migration: Add auth_id column to users table
-- Run this SQL in Supabase SQL Editor first, then run the migration script

-- Add auth_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Note: If you get an error about the column already existing, that's fine - it means it was already added
