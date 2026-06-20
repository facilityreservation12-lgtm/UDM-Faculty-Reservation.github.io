# Vercel Deployment Guide

## Deployment Status

**Preview URL:** https://udm-faculty-reservation-github-io.vercel.app

---

## Steps to Complete Setup

### Step 1: Add Environment Variables in Vercel Dashboard

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add these 3 variables:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://tryytusvitsztadzqihq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (from `.env` file or Supabase Dashboard → Settings → API) |
| `APP_URL` | `https://udm-faculty-reservation-github-io.vercel.app` |

### Step 2: Add Vercel URL to Supabase Redirect URLs

1. Go to **Supabase Dashboard → Authentication → Redirect URLs**
2. Add: `https://udm-faculty-reservation-github-io.vercel.app/**`

### Step 3: Redeploy

1. Go to **Vercel → Deployments**
2. Click **"..." → Redeploy** on the current deployment

---

## API Endpoints

### POST /api/add-user

Create a new user in both auth.users and custom users table.

**URL:** `https://udm-faculty-reservation-github-io.vercel.app/api/add-user`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "role_name": "FACULTY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "F-001",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role_name": "FACULTY"
  }
}
```

### POST /api/forgot-password

Send password reset email.

**URL:** `https://udm-faculty-reservation-github-io.vercel.app/api/forgot-password`

**Request:**
```json
{
  "email": "user@example.com",
  "redirectTo": "https://udm-faculty-reservation-github-io.vercel.app/User%20panel/reset-password.html"
}
```

---

## Files Created

- `vercel.json` - Vercel configuration
- `api/add-user.js` - Serverless function for creating users
- `api/forgot-password.js` - Serverless function for password reset

---

## Troubleshooting

### CORS Errors
Make sure Vercel deployment URL is added to Supabase allowed redirect URLs.

### Authentication Errors
Verify SUPABASE_SERVICE_ROLE_KEY is correct (not the anon key).

### User Already Exists
The API returns an error if the user already exists in auth.users or custom users table.

### Email Not Working
1. Check that EmailJS is properly initialized in the HTML files
2. Verify the email templates exist in your EmailJS dashboard
3. Check browser console for any EmailJS errors

### Paths Not Working
All paths now use absolute paths from root (`/`) which works on Vercel. If you have issues:
1. Verify the file structure on Vercel matches the local structure
2. Check that all HTML files have correct relative paths to CSS/JS files

### Reservation System Not Working
1. Verify Supabase connection is working
2. Check that the `reservations` table exists and has proper RLS policies
3. Ensure user is logged in and has valid session
