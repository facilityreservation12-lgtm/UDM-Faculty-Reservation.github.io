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
    const { email, redirectTo } = req.body

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (!existingUser) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset email has been sent'
      })
    }

    // Default redirect URL for GitHub Pages
    const defaultRedirectTo = `${process.env.APP_URL || 'https://facilityreservation12-lgtm.github.io/UDM-Faculty-Reservation.github.io'}/User%20panel/reset-password.html`

    // Send password reset email
    const { error: resetError } = await supabaseAdmin.auth.admin.resetPasswordForEmail(email, {
      redirectTo: redirectTo || defaultRedirectTo
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      // Don't reveal specific error to user
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset email has been sent'
      })
    }

    console.log('Password reset email sent to:', email)

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent. Check your email.'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
