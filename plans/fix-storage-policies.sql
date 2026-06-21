-- Fix Storage Policies for facilityreservation bucket
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Allow public uploads to facilityreservation" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads for facilityreservation" ON storage.objects;

-- Step 2: Create upload policy (allow public INSERT)
CREATE POLICY "Allow public uploads to facilityreservation"
ON storage.objects
FOR INSERT
TO PUBLIC
WITH CHECK (bucket_id = 'facilityreservation');

-- Step 3: Create read policy (allow public SELECT)
CREATE POLICY "Allow public reads for facilityreservation"
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'facilityreservation');

-- Step 4: Verify policies created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
