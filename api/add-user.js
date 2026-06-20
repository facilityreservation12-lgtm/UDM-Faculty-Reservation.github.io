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
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, first_name, last_name, role_name } = req.body

    // Validate input
    if (!email || !password || !first_name || !last_name || !role_name) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists in authentication system' })
    }

    // Check if user exists in custom users table
    const { data: existingCustomUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingCustomUser) {
      return res.status(400).json({ error: 'User already exists in custom users table' })
    }

    // Create auth user with admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email confirmation for smoother UX
      user_metadata: {
        first_name,
        last_name,
        role_name
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return res.status(400).json({ error: authError.message })
    }

    // Generate user ID based on role
    const rolePrefix = getRolePrefix(role_name)
    const newUserId = await generateUserId(rolePrefix, authUser.user.id)

    // Create custom user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        email: email,
        first_name,
        last_name,
        role_name,
        supabase_auth_id: authUser.user.id
      })

    if (userError) {
      console.error('Custom user creation error:', userError)
      // Try to rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return res.status(400).json({ error: userError.message })
    }

    console.log('User created successfully:', { email, userId: newUserId })

    return res.status(200).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUserId,
        email,
        first_name,
        last_name,
        role_name
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function getRolePrefix(roleName) {
  const normalizedRole = roleName?.toUpperCase() || ''
  
  if (normalizedRole.includes('ADMIN')) return 'A-'
  if (normalizedRole.includes('SUPER')) return 'S-'
  if (normalizedRole.includes('STUDENT')) return 'O-'
  if (normalizedRole.includes('FACULTY')) return 'F-'
  
  return 'U-'
}

async function generateUserId(rolePrefix, authId) {
  // Try to generate sequential ID first
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .like('id', `${rolePrefix}%`)
    .order('id', { ascending: false })
    .limit(1)

  if (existingUsers && existingUsers.length > 0) {
    const lastId = existingUsers[0].id
    const match = lastId.match(new RegExp(`^${rolePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`))
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1
      return `${rolePrefix}${nextNumber.toString().padStart(3, '0')}`
    }
  }

  // If no existing users with this prefix, start at 001
  return `${rolePrefix}001`
}
