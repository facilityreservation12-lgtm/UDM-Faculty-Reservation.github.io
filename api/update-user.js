import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Map role_name to role value
function getRoleValue(roleName) {
  const normalized = roleName?.toUpperCase() || ''
  if (normalized.includes('ADMIN') && !normalized.includes('SUPER')) return 'admin'
  if (normalized.includes('SUPER')) return 'super_admin'
  if (normalized.includes('STUDENT')) return 'student_organization'
  if (normalized.includes('FACULTY')) return 'faculty'
  return roleName?.toLowerCase() || 'faculty'
}

// Normalize role name for storage
function normalizeRoleName(roleName) {
  return roleName?.toLowerCase().replace(/\s+/g, '_') || roleName
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST or PUT
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, auth_id, first_name, last_name, email, role, role_name, password } = req.body

    // Validate input
    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' })
    }

    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields: first_name, last_name, email, or role' })
    }

    console.log('Update user request:', { user_id, auth_id, first_name, last_name, email, role, role_name })

    // First, get the user to find their auth_id if not provided
    let authUserId = auth_id
    if (!authUserId) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('auth_id, email')
        .eq('id', user_id)
        .single()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        return res.status(400).json({ error: 'User not found in database' })
      }
      
      authUserId = userData.auth_id
      console.log('Found auth_id:', authUserId, 'Current email:', userData.email)
    }

    const roleValue = getRoleValue(role)
    const normalizedRoleName = normalizeRoleName(role)

    // Update auth.users if auth_id exists and email changed
    if (authUserId) {
      const { data: currentAuthUser } = await supabaseAdmin.auth.admin.getUserById(authUserId)
      
      // Check if email needs to be updated in auth.users
      if (currentAuthUser?.user && currentAuthUser.user.email !== email) {
        console.log('Email changed, updating auth.users...')
        
        // Update email in auth.users
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email: email,
          email_confirm: true
        })
        
        if (authUpdateError) {
          console.error('Error updating auth.users email:', authUpdateError)
          return res.status(400).json({ error: 'Failed to update email in authentication system: ' + authUpdateError.message })
        }
        
        console.log('Updated email in auth.users')
      }
      
      // Update user metadata in auth.users
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          first_name,
          last_name,
          role_name: normalizedRoleName
        }
      })
      
      if (metadataError) {
        console.error('Error updating auth.users metadata:', metadataError)
        // Continue even if metadata update fails - the main user table update is more important
      } else {
        console.log('Updated metadata in auth.users')
      }
    }

    // Update users table
    const updateData = {
      first_name,
      last_name,
      email,
      role_name: normalizedRoleName,
      role: roleValue
    }

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id)

    if (userUpdateError) {
      console.error('Error updating users table:', userUpdateError)
      return res.status(400).json({ error: 'Failed to update user in database: ' + userUpdateError.message })
    }

    console.log('User updated successfully:', user_id)

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user_id,
        first_name,
        last_name,
        email,
        role_name: normalizedRoleName,
        role: roleValue
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}
