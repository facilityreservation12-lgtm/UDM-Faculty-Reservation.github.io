-- ===============================================
-- ADD SIGNATURE COLUMN TO RESERVATIONS TABLE
-- ===============================================
-- This migration adds the requested_by_signature column
-- to store the e-signature URL from the user

-- Add the signature column to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS requested_by_signature TEXT;

