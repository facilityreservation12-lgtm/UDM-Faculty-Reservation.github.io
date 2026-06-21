/**
 * Migration Script: Populate auth_id for existing users
 * 
 * This script matches users in the custom 'users' table with their
 * corresponding entries in Supabase Auth 'auth.users' by email,
 * then updates the users table with the auth_id.
 * 
 * Run with: node scripts/migrateAuthIds.js
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migrateAuthIds() {
  console.log('Starting auth_id migration...')
  console.log('=====================================')

  try {
    // 1. Get all users from auth.users
    console.log('\n[1/3] Fetching users from auth.users...')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw new Error('Failed to fetch auth users: ' + authError.message)
    }
    
    console.log(`Found ${authUsers.users.length} users in auth.users`)
    
    // Create a map of email -> auth_id for quick lookup
    const authUserMap = new Map()
    authUsers.users.forEach(user => {
      authUserMap.set(user.email.toLowerCase(), user.id)
    })
    
    // 2. Get all users from custom users table
    console.log('\n[2/3] Fetching users from custom users table...')
    const { data: customUsers, error: customError } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_id')
    
    if (customError) {
      console.error('Error fetching custom users:', customError)
      throw new Error('Failed to fetch custom users: ' + customError.message)
    }
    
    console.log(`Found ${customUsers.length} users in users table`)
    
    // 3. Update users that are missing auth_id
    console.log('\n[3/3] Updating users with auth_id...')
    
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const user of customUsers) {
      // Skip if already has auth_id
      if (user.auth_id) {
        console.log(`  SKIP ${user.id} (${user.email}) - already has auth_id`)
        skippedCount++
        continue
      }
      
      const authId = authUserMap.get(user.email.toLowerCase())
      
      if (!authId) {
        console.warn(`  WARN ${user.id} (${user.email}) - no matching auth user found`)
        skippedCount++
        continue
      }
      
      // Update the user with auth_id
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ auth_id: authId })
        .eq('id', user.id)
      
      if (updateError) {
        console.error(`  ERROR ${user.id} (${user.email}) - failed to update: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  OK ${user.id} (${user.email}) -> auth_id: ${authId}`)
        updatedCount++
      }
    }
    
    console.log('\n=====================================')
    console.log('Migration Summary:')
    console.log(`  Updated: ${updatedCount}`)
    console.log(`  Skipped: ${skippedCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log('=====================================')
    
    if (errorCount > 0) {
      console.warn(`\n${errorCount} users failed to update. Check errors above.`)
      process.exit(1)
    }
    
    console.log('\nMigration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateAuthIds()
