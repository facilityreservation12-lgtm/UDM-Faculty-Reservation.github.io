# Forgot Password Implementation - Supabase Auth Direct (GitHub Pages Compatible)

## Overview

This implementation uses **Supabase Auth Direct** - a client-side only approach that works with GitHub Pages static hosting. No Node.js server required.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌──────────────────┐     ┌──────────────────────────────┐  │
│  │   login.html     │────▶│  supabase.auth.signInWith   │  │
│  │   (User enters   │     │  Password({email, password})│  │
│  │    email+pass)   │     └──────────────────────────────┘  │
│  └──────────────────┘                    │                  │
│         │                               ▼                  │
│         │                    ┌──────────────────────┐       │
│         │                    │   Supabase Auth     │       │
│         │                    │   (auth.users)     │       │
│         │                    └──────────────────────┘       │
│         │                               │                  │
│         ▼                               ▼                  │
│  ┌──────────────────┐     ┌──────────────────────┐       │
│  │  Query users     │◀────│   Returns session    │       │
│  │  table for role │     │   + user metadata    │       │
│  └──────────────────┘     └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Flow Diagrams

### Login Flow
```
User → Enters email + password → supabase.auth.signInWithPassword()
     → On success: Query users table by email → Get role → Redirect
```

### Forgot Password Flow
```
User → Clicks "Forgot Password" → Enters email
     → supabase.auth.resetPasswordForEmail(email, {redirectTo})
     → Supabase sends email with reset link
     → User clicks link → Goes to reset-password.html
     → User sets new password → supabase.auth.updateUser({password})
```

## Files Changed

| File | Change |
|------|--------|
| `User panel/login.html` | Changed User ID input to email, updated modal |
| `User panel/Javascript/login.js` | Uses `signInWithPassword()` and `resetPasswordForEmail()` directly |
| `User panel/reset-password.html` | New page for password reset |
| `User panel/Javascript/reset-password.js` | Handles token validation and password update |
| `User panel/CSS/login.css` | Added modal styles |
| `scripts/migrateUsersToSupabaseAuth.js` | Migration script for existing users |
| `plans/forgot-password-migration.sql` | Database RLS policies |

## Setup Instructions

### Step 1: Configure Supabase Dashboard

1. Go to **Authentication → Settings**
2. Set **Site URL** to your GitHub Pages URL (e.g., `https://username.github.io`)
3. Add **Redirect URLs**:
   - `https://username.github.io/User%20panel/reset-password.html`
   - `https://username.github.io/User%20panel/`

### Step 2: Configure Email Templates

1. Go to **Authentication → Email Templates → Password Reset**
2. The template should include `{{ .ConfirmationURL }}` which Supabase automatically replaces with the reset link

### Step 3: Run Database Migration

1. Open **Supabase SQL Editor**
2. Run the SQL from `plans/forgot-password-migration.sql`

### Step 4: Migrate Existing Users

```bash
node scripts/migrateUsersToSupabaseAuth.js
```

This creates Supabase Auth accounts for all users in your custom `users` table.

**Important**: After migration, users must use "Forgot Password" to set their actual password (plain text passwords cannot be migrated to bcrypt format).

### Step 5: Update User Emails (if needed)

Make sure all users in your `users` table have valid email addresses:
```sql
SELECT id, email, first_name FROM users WHERE email IS NULL;
```

## User Migration Details

Since passwords are stored in plain text in your custom `users` table, they cannot be directly migrated to Supabase Auth (which uses bcrypt hashing).

**Solution**: The migration script creates auth accounts with random passwords. Users will need to:

1. Click "Forgot Password" on login page
2. Enter their email
3. Check their email for reset link
4. Set a new password

After this one-time reset, they can login normally with email + new password.

## Security Considerations

1. **No server needed**: All auth happens client-side with Supabase
2. **RLS policies**: Protect your `users` table with Row Level Security
3. **Email verification**: Supabase handles email verification by default
4. **Password requirements**: Supabase enforces minimum 6 characters

## Troubleshooting

### "User not found" after login
- Ensure the user's email in `users` table matches their Supabase Auth email
- Run the migration script to create auth accounts

### Password reset email not received
- Check spam folder
- Verify Site URL is set correctly in Supabase Dashboard
- Check Redirect URLs include your reset-password.html URL

### Login not working after migration
- User must reset their password first using "Forgot Password"
- Clear browser localStorage and try again

## Testing Checklist

- [ ] Login with existing user (email + password after reset)
- [ ] Forgot password flow sends email
- [ ] Password reset link opens correct page
- [ ] New password can be set
- [ ] User can login with new password
- [ ] Role-based redirect works correctly
