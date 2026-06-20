# Fix: Supabase Storage RLS Policy for Signature Uploads

## Problem
The signature upload fails with:
```
StorageApiError: new row violates row-level security policy
```

This means the Supabase Storage bucket `facilityreservation` has RLS policies that prevent file uploads.

## Solution

### Step 1: Run Storage Policies SQL

Go to your Supabase SQL Editor and run the following to fix the storage policies:

```sql
-- Remove existing related policies (if any)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_storage_access" ON storage.objects;

-- Allow anyone (public) to INSERT into the storage.objects table for this bucket.
CREATE POLICY "Allow public uploads to facilityreservation"
ON storage.objects
FOR INSERT
TO PUBLIC
WITH CHECK (bucket_id = 'facilityreservation');

-- Allow public read/select for files in the bucket
CREATE POLICY "Allow public reads for facilityreservation"
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'facilityreservation');
```

### Step 2: Verify Bucket RLS Settings

In Supabase Dashboard:
1. Go to **Storage** > **facilityreservation**
2. Check **Policies** tab - you should see the policies above
3. Make sure RLS is enabled on the bucket

### Step 3: Alternative - Disable RLS on Storage (Not Recommended for Production)

If the policies still don't work, you can temporarily disable RLS on the storage.objects table:

```sql
-- Disable RLS on storage.objects (use with caution)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

## Verification
After applying the fixes, test signature upload again. You should see:
- "Signature uploaded successfully: Reserved Facilities/signature_PH-XXXX.png" in console
- `requested_by_signature` field populated in the database
