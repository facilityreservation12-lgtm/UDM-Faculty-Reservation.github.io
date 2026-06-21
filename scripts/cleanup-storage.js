/**
 * Cleanup script for Supabase Storage
 * Deletes all files in the 'facilityreservation' bucket at the root level
 * while preserving subdirectories
 * 
 * Usage: 
 *   1. Preview files: node scripts/cleanup-storage.js
 *   2. Actually delete: Set DRY_RUN = false and run again
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://tryytusvitsztadzqihq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA';
const BUCKET_NAME = 'facilityreservation';

// Set to false when ready to actually delete files
const DRY_RUN = true;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupStorage() {
  console.log('='.repeat(60));
  console.log('Supabase Storage Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be deleted)' : 'LIVE (files WILL be deleted)'}`);
  console.log('='.repeat(60));
  
  // First, list all folders to understand the structure
  console.log('\n[1] Listing folders/subdirectories...');
  const { data: folders, error: folderError } = await sb
    .storage
    .from(BUCKET_NAME)
    .list('', { limit: 1000 });
  
  if (folderError) {
    console.error('Error listing storage:', folderError);
    return;
  }
  
  // Identify folders vs files
  const allItems = folders || [];
  const folderNames = new Set();
  const rootFiles = [];
  
  allItems.forEach(item => {
    // Folders typically have names ending in / or are identified by having no metadata
    if (item.name.endsWith('/')) {
      folderNames.add(item.name.replace(/\/$/, ''));
    } else if (item.name && !item.name.includes('/')) {
      // Root level file
      rootFiles.push(item);
    }
    // Files with / in them are inside folders - we'll handle them when listing folders
  });
  
  console.log(`Found ${folderNames.size} folders: ${[...folderNames].join(', ') || 'none'}`);
  
  // Collect all files to potentially delete
  let allFilesToDelete = [...rootFiles];
  
  // For each folder, list and collect files inside
  console.log('\n[2] Scanning folders for files...');
  for (const folderName of folderNames) {
    const { data: folderContents, error: folderListError } = await sb
      .storage
      .from(BUCKET_NAME)
      .list(folderName, { limit: 1000 });
    
    if (folderListError) {
      console.warn(`Could not list folder ${folderName}:`, folderListError.message);
      continue;
    }
    
    const filesInFolder = (folderContents || []).filter(f => 
      f.name && !f.name.endsWith('/')
    );
    
    console.log(`  Folder "${folderName}": ${filesInFolder.length} files`);
    filesInFolder.forEach(f => {
      allFilesToDelete.push({ ...f, fullPath: `${folderName}/${f.name}` });
    });
  }
  
  console.log(`\n[3] Total files found: ${allFilesToDelete.length}`);
  
  if (allFilesToDelete.length === 0) {
    console.log('\nNo files to delete. Exiting.');
    return;
  }
  
  // Show files to be deleted
  console.log('\n[4] Files to be deleted:');
  console.log('-'.repeat(60));
  
  if (rootFiles.length > 0) {
    console.log(`\nRoot level files (${rootFiles.length}):`);
    rootFiles.forEach(f => console.log(`  - ${f.name} (${(f.metadata?.size || 0) / 1024} KB)`));
  }
  
  // Group folder files
  const filesByFolder = {};
  allFilesToDelete.forEach(f => {
    if (f.fullPath) {
      const parts = f.fullPath.split('/');
      const folder = parts[0];
      const fileName = parts[1];
      if (!filesByFolder[folder]) filesByFolder[folder] = [];
      filesByFolder[folder].push({ name: fileName, item: f });
    }
  });
  
  Object.entries(filesByFolder).forEach(([folder, files]) => {
    console.log(`\n${folder}/ (${files.length} files):`);
    files.forEach(f => {
      const size = f.item.metadata?.size || 0;
      console.log(`  - ${f.name} (${(size / 1024).toFixed(1)} KB)`);
    });
  });
  
  console.log('-'.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No files were deleted ***');
    console.log('To actually delete, set DRY_RUN = false in this script');
  } else {
    console.log('\n[5] Deleting files...');
    
    // Delete files one by one or in batch
    try {
      const pathsToDelete = allFilesToDelete.map(f => f.fullPath || f.name);
      
      const { data, error } = await sb
        .storage
        .from(BUCKET_NAME)
        .remove(pathsToDelete);
      
      if (error) {
        console.error('Error deleting files:', error);
      } else {
        console.log(`\n✓ Successfully deleted ${pathsToDelete.length} files!`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Cleanup complete!');
  console.log('='.repeat(60));
}

cleanupStorage().catch(console.error);
