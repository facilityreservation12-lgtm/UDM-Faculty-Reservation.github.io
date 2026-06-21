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

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST or DELETE
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, auth_id } = req.body

    // Validate input
    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' })
    }

    console.log('Delete user request:', { user_id, auth_id })

    // First, get the user to find their auth_id if not provided
    let authUserId = auth_id
    let userExists = false
    
    if (!authUserId) {
      console.log('Looking up user with id:', user_id)
      
      // Try to select with auth_id first, if column doesn't exist it'll fail
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', user_id)
        .single()
      
      if (userError) {
        console.error('Error fetching user from users table:', userError)
        return res.status(400).json({ 
          error: 'User not found in database',
          details: userError.message,
          hint: 'Check if the user_id exists in the users table'
        })
      }
      
      console.log('Found user:', userData)
      userExists = true
      
      // Try to get auth_id if the column exists
      try {
        const { data: userWithAuth, error: authError } = await supabaseAdmin
          .from('users')
          .select('auth_id')
          .eq('id', user_id)
          .single()
        
        if (!authError && userWithAuth) {
          authUserId = userWithAuth.auth_id
          console.log('Found auth_id:', authUserId)
        } else if (authError && authError.code === '42703') {
          // Column doesn't exist - skip auth deletion
          console.warn('auth_id column does not exist, skipping auth deletion')
          authUserId = null
        }
      } catch (e) {
        console.warn('Could not fetch auth_id:', e.message)
        authUserId = null
      }
    }

    // Delete from auth.users first (if auth_id exists)
    if (authUserId) {
      try {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
        
        if (authDeleteError) {
          console.error('Error deleting from auth.users:', authDeleteError)
          // Continue to try deleting from users table even if auth delete fails
          // This could happen if auth user was already deleted
        } else {
          console.log('Deleted user from auth.users:', authUserId)
        }
      } catch (e) {
        console.error('Exception deleting from auth.users:', e.message)
      }
    } else {
      console.log('Skipping auth.users deletion - no auth_id available')
    }

    // Delete from custom users table
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id)

    if (userDeleteError) {
      console.error('Error deleting from users table:', userDeleteError)
      return res.status(400).json({ error: userDeleteError.message })
    }

    console.log('User deleted successfully:', user_id)

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: user_id
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}
