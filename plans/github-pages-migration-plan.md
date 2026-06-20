# GitHub Pages Migration Plan - UDM Faculty Reservation System

## Executive Summary

This document outlines the considerations and requirements for deploying the UDM Faculty Reservation System to **GitHub Pages** as a fully static site. The goal is to ensure all user-facing functions work without traditional backend support.

---

## Current Architecture Analysis

### ✅ Components That Already Work (Client-Side Ready)

| Component | Current Implementation | Status |
|-----------|----------------------|--------|
| **Authentication** | [`supabase.auth.signInWithPassword()`](User%20panel/Javascript/login.js:171) | ✅ Works with static hosting |
| **User Login** | Direct Supabase Auth calls | ✅ Works |
| **Password Reset** | [`supabase.auth.resetPasswordForEmail()`](User%20panel/Javascript/login.js:117) | ✅ Works |
| **Database CRUD** | Supabase JS client for all operations | ✅ Works |
| **Calendar Display** | Client-side JavaScript | ✅ Works |
| **Dashboard Functions** | [`Userdashboard.js`](User%20panel/Javascript/Userdashboard.js) | ✅ Works |
| **File/Document Uploads** | Supabase Storage API | ✅ Works |
| **PDF Generation** | html2pdf.js (client-side) | ✅ Works |

### ❌ Components That Need Modification

| Component | Issue | File(s) |
|-----------|-------|---------|
| **Email Sending** | Sends to `localhost:8000` which doesn't exist on GitHub Pages | [`Admin panel/Admin-panel/java/sendEmail.js:23`](Admin%20panel/Admin-panel/java/sendEmail.js:23), [`SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js`](SuperAdmin%20panel/SuperAdmin-panel/java/sendEmail.js) |
| **Hardcoded localhost URLs** | References `localhost:5500` in email templates | [`sendEmail.js:123`](Admin%20panel/Admin-panel/java/sendEmail.js:123), [`sendEmail.js:129`](Admin%20panel/Admin-panel/java/sendEmail.js:129) |
| **Server.js Endpoints** | `/add-user`, `/users`, `/forgot-password` endpoints | [`server.js`](server.js) |

---

## Critical Issues to Address

### 1. Email Functionality (HIGH PRIORITY)

**Problem:** The email sending feature currently uses `fetch('http://localhost:8000/api/send-email')` which won't work on GitHub Pages.

**Solution Options:**

#### Option A: EmailJS (RECOMMENDED)
- Free tier: 200 emails/month
- No backend required
- Client-side SDK available
- Template-based emails

```javascript
// New email implementation
import emailjs from '@emailjs/browser';

emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
  to_email: 'facility.reservation12@gmail.com',
  // ... other parameters
});
```

#### Option B: Supabase Edge Functions (if available on your plan)
- Serverless functions that run at the edge
- Can send emails using SMTP services

#### Option C: Third-party API (SendGrid, Mailgun)
- Requires API key exposure (acceptable with RLS)
- More setup required

---

### 2. Dynamic URLs (RECOMMENDED APPROACH)

**Problem:** Hardcoded URLs break between localhost and GitHub Pages environments.

**Solution:** Use `window.location.origin` for dynamic URL generation:

```javascript
// Get base URL dynamically - works in ALL environments
const baseUrl = window.location.origin;

// For GitHub Pages with repo name subdirectory, construct full path:
const repoName = '/UDM-Faculty-Reservation.github.io';
const fullBaseUrl = window.location.origin + repoName;

// Build URLs dynamically
const slipUrl = `${fullBaseUrl}/Admin%20panel/Admin-panel/Slip.html`;
const docUploadUrl = `${fullBaseUrl}/User%20panel/DocumentUpload.html`;
```

**Files with localhost references to update:**

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| [`Admin panel/Admin-panel/java/sendEmail.js`](Admin%20panel/Admin-panel/java/sendEmail.js) | 23 | `localhost:8000` | Convert to EmailJS |
| [`Admin panel/Admin-panel/java/sendEmail.js`](Admin%20panel/Admin-panel/java/sendEmail.js) | 123, 129 | `localhost:5500` | Use dynamic `window.location.origin` |
| [`SuperAdmin panel/SuperAdmin-panel/java/sendEmail.js`](SuperAdmin%20panel/SuperAdmin-panel/java/sendEmail.js) | 30, 82, 86, 90, 117 | `localhost:5500`, `localhost:8000` | EmailJS + dynamic URLs |

**Dynamic URL Helper Function (add to shared config):**

```javascript
// In User panel/Javascript/config.js or similar shared location
window.getAppBaseUrl = function() {
  // For localhost (development)
  if (window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  // For GitHub Pages (production) - adjust repo name as needed
  return window.location.origin + '/UDM-Faculty-Reservation.github.io';
};
```

---

### 3. Supabase Configuration (CRITICAL)

**Required Changes in Supabase Dashboard:**

1. **Authentication → Site URL**
   - Set to: `https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io`
   - Or your custom domain if using one

2. **Authentication → Redirect URLs**
   Add these URLs:
   ```
   https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/
   https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/User%20panel/
   https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/User%20panel/reset-password.html
   https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/Admin%20panel/
   https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/SuperAdmin%20panel/
   ```

3. **Row Level Security (RLS)**
   - Ensure all tables have proper RLS policies
   - The anon key IS exposed in client code - this is expected
   - RLS policies must protect user data

---

## Security Considerations

### What's Acceptable to Expose (Client-Side)

| Item | Exposure Level | Notes |
|------|---------------|-------|
| **Supabase anon key** | Public | This is by design - RLS protects data |
| **Public data** | Anyone can read | Facilities list, etc. |
| **User-specific data** | Only authenticated users | Enforced by RLS |

### What Must NOT Be Exposed

| Item | Must Remain | Reason |
|------|-------------|--------|
| **Service role key** | Server-side ONLY | Full database access |
| **Admin functions** | Server-side or Edge Functions | User management |

---

## Directory/Path Considerations

### GitHub Pages URL Structure

Your site will be available at:
```
https://UDM-FACULTY.github.io/UDM-Faculty-Reservation.github.io/
```

**Path mapping:**
```
index.html                          → /
User panel/login.html               → /User%20panel/login.html
Admin panel/Admin-panel/            → /Admin%20panel/Admin-panel/
SuperAdmin panel/SuperAdmin-panel/  → /SuperAdmin%20panel/SuperAdmin-panel/
```

### Required: Remove or Repurpose server.js

The [`server.js`](server.js) file contains:
- `/add-user` endpoint - **Not needed** (Supabase Auth handles registration)
- `/users` endpoint - **Not needed** (Supabase client can query directly)
- `/forgot-password` endpoint - **Functionality preserved** via `supabase.auth.resetPasswordForEmail()`

**Action:** This file can be archived/deleted after migration.

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Update Supabase Dashboard with GitHub Pages URLs
- [ ] Update all Supabase client configurations with correct URL
- [ ] Test authentication flow end-to-end

### Phase 2: Fix Broken Links
- [ ] Replace `localhost:5500` references with GitHub Pages URLs
- [ ] Replace `localhost:8000` email API calls with EmailJS

### Phase 3: Email Integration
- [ ] Create EmailJS account
- [ ] Set up email templates matching current format
- [ ] Replace fetch calls with EmailJS SDK calls

### Phase 4: Cleanup
- [ ] Remove or archive server.js
- [ ] Remove node_modules from repository (add to .gitignore)
- [ ] Test all user flows (login, reservation, admin functions)

### Phase 5: Deployment
- [ ] Enable GitHub Pages in repository settings
- [ ] Verify all functionality in production

---

## Questions Requiring User Input

1. **Custom Domain:** Do you plan to use a custom domain (e.g., `reservation.udm.edu.ph`) or the default GitHub Pages URL?

2. **Email Service:** Which email approach do you prefer?
   - EmailJS (easiest, free tier available)
   - Continue with Supabase (if Edge Functions are available on your plan)
   - Other service (SendGrid, Mailgun, etc.)

3. **User Registration:** How should new users register? 
   - Admin creates accounts (current flow)
   - Self-registration with email verification
   - Invitation-only system

4. **Service Role Key Usage:** Are you using the service role key anywhere that would break? The server.js `/forgot-password` endpoint was the main use case, and that functionality is now available directly through Supabase Auth.

---

## Migration Effort Estimate

| Task | Complexity | Notes |
|------|------------|-------|
| Supabase URL updates | Low | Find/replace across ~20 files |
| Email fix (EmailJS) | Medium | New service integration |
| Remove server.js | Low | Archive, test that nothing breaks |
| Testing | Medium | Full regression testing needed |

---

## References

- [Supabase Auth with GitHub Pages](https://supabase.com/docs/guides/auth/auth-helpers)
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
