# Vercel Deployment Fix Plan

## Deployment URL
**Production URL:** `https://udm-faculty-reservation-github-io.vercel.app/`

---

## Issues Identified

### 1. **Path Issues (Critical)**
The project was designed for GitHub Pages with subdirectory `/UDM-Faculty-Reservation.github.io`, but Vercel serves from root `/`.

**Affected Files:**
- `SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js` - Line 37
- `SuperAdmin panel/SuperAdmin-panel/java/SA_EmailNotification.js` - Line 49
- `Admin panel/Admin-panel/java/sendEmail.js` - Line 37
- `api/forgot-password.js` - Line 51 (fallback URL)

### 2. **Login Redirect URL Issues**
`User panel/Javascript/login.js` uses relative paths that won't work on Vercel:
```javascript
window.location.href = '../SuperAdmin panel/SuperAdmin-panel/SuperAdminDashboard.html';
window.location.href = '../Admin panel/Admin-panel/AdminDashboard.html';
```

### 3. **Environment Variable Issues**
- `.env` has `APP_URL=http://localhost:3000` (wrong for Vercel)
- `api/forgot-password.js` has GitHub Pages fallback URL

---

## Fix Plan

### Step 1: Update vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Step 2: Update vercel-env-example.txt
```
SUPABASE_URL=https://tryytusvitsztadzqihq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
APP_URL=https://udm-faculty-reservation-github-io.vercel.app
```

### Step 3: Fix sendEmail.js (SuperAdmin panel)
**File:** `SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js`

**Before:**
```javascript
function getAppBaseUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin;
    }
    // For GitHub Pages (production)
    return window.location.origin + '/UDM-Faculty-Reservation.github.io';
}
```

**After:**
```javascript
function getAppBaseUrl() {
    // Works for all environments (localhost, Vercel, GitHub Pages)
    return window.location.origin;
}
```

### Step 4: Fix sendEmail.js (Admin panel)
**File:** `Admin panel/Admin-panel/java/sendEmail.js`

Same change as Step 3.

### Step 5: Fix SA_EmailNotification.js
**File:** `SuperAdmin panel/SuperAdmin-panel/java/SA_EmailNotification.js`

Same change as Step 3.

### Step 6: Fix login.js redirect URLs
**File:** `User panel/Javascript/login.js`

**Before:**
```javascript
case 'super_admin':
  window.location.href = '../SuperAdmin panel/SuperAdmin-panel/SuperAdminDashboard.html';
  break;
case 'admin':
  window.location.href = '../Admin panel/Admin-panel/AdminDashboard.html';
  break;
```

**After:**
```javascript
case 'super_admin':
  window.location.href = '/SuperAdmin panel/SuperAdmin-panel/SuperAdminDashboard.html';
  break;
case 'admin':
  window.location.href = '/Admin panel/Admin-panel/AdminDashboard.html';
  break;
```

### Step 7: Fix api/forgot-password.js
**File:** `api/forgot-password.js`

**Before:**
```javascript
const defaultRedirectTo = `${process.env.APP_URL || 'https://facilityreservation12-lgtm.github.io/UDM-Faculty-Reservation.github.io'}/User%20panel/reset-password.html`
```

**After:**
```javascript
const defaultRedirectTo = `${process.env.APP_URL || 'https://udm-faculty-reservation-github-io.vercel.app'}/User%20panel/reset-password.html`
```

---

## Vercel Environment Variables to Set

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://tryytusvitsztadzqihq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service role key from Supabase) |
| `APP_URL` | `https://udm-faculty-reservation-github-io.vercel.app` |

---

## Supabase Redirect URLs to Add

In Supabase Dashboard → Authentication → Redirect URLs, add:
```
https://udm-faculty-reservation-github-io.vercel.app/**
https://udm-faculty-reservation-github-io.vercel.app/User%20panel/reset-password.html
```

---

## Files to Modify

1. `vercel.json` - Routing configuration
2. `vercel-env-example.txt` - Environment variable template
3. `SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js` - Remove GitHub Pages path
4. `SuperAdmin panel/SuperAdmin-panel/java/SA_EmailNotification.js` - Remove GitHub Pages path
5. `Admin panel/Admin-panel/java/sendEmail.js` - Remove GitHub Pages path
6. `User panel/Javascript/login.js` - Fix redirect URLs
7. `api/forgot-password.js` - Fix fallback URL
8. `VERCEL_DEPLOYMENT.md` - Update documentation

---

## Post-Deployment Checklist

- [ ] Verify all environment variables are set in Vercel dashboard
- [ ] Add Vercel URL to Supabase redirect URLs
- [ ] Test login flow from landing page
- [ ] Test password reset email functionality
- [ ] Test email sending from Admin/SuperAdmin panels
- [ ] Test all navigation links work correctly
- [ ] Verify calendar and reservation functionality
