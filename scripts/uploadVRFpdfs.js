/**
 * Script to batch upload VRF PDFs to Supabase Storage
 * 
 * Usage:
 * 1. Place your PDF files in a folder (e.g., ./vrfs-to-upload/)
 * 2. Rename files to match the format: VRF-<request_id>.pdf (e.g., VRF-PH-0001.pdf)
 * 3. Update the FOLDER_PATH constant below
 * 4. Run: node scripts/uploadVRFpdfs.js
 * 
 * Requirements:
 * - npm install @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============== CONFIGURATION ==============
const FOLDER_PATH = './vrfs-to-upload'; // Folder containing your VRF PDF files
const BUCKET_NAME = 'facilityreservation';
const STORAGE_FOLDER = 'Reserved Facilities';

// Supabase credentials (use your actual values)
const SUPABASE_URL = 'https://tryytusvitsztadzqihq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc4NDIxNCwiZXhwIjoyMDk3MzYwMjE0fQ.XrT0bQ5oQ9h7bQR6R9h5Yl1wJvT5kX4H8z9Y0xL6m8I'; // Service role key for admin operations
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadVRF(filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Uint8Array(fileBuffer);
  
  const filePathInStorage = `${STORAGE_FOLDER}/${fileName}`;
  
  console.log(`Uploading ${fileName} to ${BUCKET_NAME}/${filePathInStorage}...`);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePathInStorage, blob, {
      contentType: 'application/pdf',
      upsert: true // Overwrite if exists
    });
  
  if (error) {
    console.error(`  ❌ Failed to upload ${fileName}:`, error.message);
    return false;
  }
  
  console.log(`  ✅ Successfully uploaded ${fileName}`);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePathInStorage);
  
  console.log(`  📎 Public URL: ${urlData.publicUrl}`);
  
  return true;
}

async function main() {
  console.log('🚀 VRF PDF Batch Upload Script');
  console.log('============================\n');
  
  // Check if folder exists
  if (!fs.existsSync(FOLDER_PATH)) {
    console.error(`❌ Error: Folder "${FOLDER_PATH}" does not exist!`);
    console.log('\nPlease create the folder and add your VRF PDF files there.');
    console.log('Files should be named: VRF-<request_id>.pdf (e.g., VRF-PH-0001.pdf)');
    process.exit(1);
  }
  
  // Get all PDF files in folder
  const files = fs.readdirSync(FOLDER_PATH)
    .filter(file => file.toLowerCase().endsWith('.pdf'));
  
  if (files.length === 0) {
    console.log(`📂 No PDF files found in "${FOLDER_PATH}"`);
    process.exit(0);
  }
  
  console.log(`Found ${files.length} PDF file(s) to upload:\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const filePath = path.join(FOLDER_PATH, file);
    const success = await uploadVRF(filePath, file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    console.log('');
  }
  
  console.log('============================');
  console.log(`✅ Upload complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

main().catch(console.error);
