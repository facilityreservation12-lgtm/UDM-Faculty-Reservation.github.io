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
