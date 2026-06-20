/**
 * User Migration Script - Migrate existing users to Supabase Auth
 * 
 * IMPORTANT: This script needs SUPABASE_SERVICE_ROLE_KEY to work
 * 
 * How it works:
 * 1. Reads all users from the custom 'users' table
 * 2. Creates corresponding accounts in Supabase Auth (auth.users)
 * 3. Users will need to use "Forgot Password" to set their actual password
 *    (Because we can't migrate plain text passwords to bcrypt format)
 * 
 * Run: node scripts/migrateUsersToSupabaseAuth.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function migrateUsers() {
  console.log('Starting user migration to Supabase Auth...\n');

  try {
    // 1. Fetch all users from custom users table
    console.log('Fetching users from custom users table...');
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role_name');

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${users.length} users to migrate\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of users) {
      console.log(`Processing: ${user.id} (${user.email})`);

      if (!user.email) {
        console.log(`  ⚠️  Skipping - no email address\n`);
        skipCount++;
        continue;
      }

      try {
        // Check if user already exists in auth.users
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = existingAuthUsers?.users.find(u => u.email === user.email);

        if (existingAuthUser) {
          console.log(`  ⚠️  Auth user already exists for ${user.email}\n`);
          skipCount++;
          continue;
        }

        // Create auth user with admin API
        // Note: We set a random password. User will need to use "Forgot Password" to reset it.
        const tempPassword = generateRandomPassword();
        
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            original_user_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            role_name: user.role_name
          }
        });

        if (createError) {
          // Handle "User already registered" error gracefully
          if (createError.message.includes('already been registered') || createError.code === 'user_already_exists') {
            console.log(`  ⚠️  User already registered in auth\n`);
            skipCount++;
          } else {
            console.error(`  ❌ Error creating auth user: ${createError.message}\n`);
            errorCount++;
          }
          continue;
        }

        console.log(`  ✅ Created auth user: ${newAuthUser.id}\n`);
        successCount++;

      } catch (err) {
        console.error(`  ❌ Unexpected error: ${err.message}\n`);
        errorCount++;
      }
    }

    console.log('========================================');
    console.log('Migration Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⚠️  Skipped: ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('========================================');
    console.log('\nMigration complete!');
    console.log('\n⚠️  IMPORTANT: All migrated users will need to use "Forgot Password"');
    console.log('to set their actual password since plain text passwords cannot be migrated.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

function generateRandomPassword() {
  // Generate a random 32-character password that will never be used
  // Users will reset it via forgot password flow
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Run migration
migrateUsers();
