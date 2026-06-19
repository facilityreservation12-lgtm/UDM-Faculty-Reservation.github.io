# Activity Logging Implementation Plan

## Current State Analysis

### Database
- `activity_logs` table exists with columns: `id`, `user_id`, `request_id`, `action`, `ip_address`, `created_at`

### SuperAdmin Panel
- Has `SA_Activitylog.html` and `SA_Activitylog_updated.js` with `logActivity()` function
- **Problem**: `logActivity()` is NEVER called anywhere - no actual logging is happening
- Has "Logs" menu item in sidebar

### Admin Panel
- **NO** activity log page
- **NO** "Logs" menu item in sidebar
- Same request flow as SuperAdmin but **NO LOGGING**

### User Panel
- `VRF.js` - When user submits reservation, creates a reservation with status 'request'
- **NO LOGGING** of request creation

### Critical Bug Found
- Both `SA_Pending.js` and `AD_pending.js` have "Reject" buttons that do NOT actually reject requests
- Current code: Reject button sets status back to 'pending' (idempotent operation = no change)
- This means requests can never be rejected!

---

## Implementation Plan

### Phase 1: Fix Rejection Logic

**Files to modify:**
- `SuperAdmin panel/SuperAdmin-panel/java/SA_Pending.js`
- `Admin panel/Admin-panel/java/AD_pending.js`

**Changes:**
1. Change `disapproveBtn.onclick` to update status to `'rejected'` instead of `'pending'`

---

### Phase 2: Add Activity Logging to SuperAdmin

**Files to modify:**

#### 1. `SuperAdmin panel/SuperAdmin-panel/java/SA_REQ_IncomingRequest.js`
- Add `logActivity()` call in `markAsPending(requestId)` function
- Action: `"VRF Printed - Request Moved to Pending"` or `"Request Reviewed"`

#### 2. `SuperAdmin panel/SuperAdmin-panel/java/SA_Pending.js`
- Add `logActivity()` call in `approveBtn.onclick` 
  - Action: `"Request Accepted"`
- Add `logActivity()` call in `disapproveBtn.onclick`
  - Action: `"Request Rejected"`

#### 3. `SuperAdmin panel/SuperAdmin-panel/java/SA_Activitylog_updated.js`
- Ensure `logActivity()` function properly handles user ID from localStorage
- Ensure it inserts into `activity_logs` table with correct `request_id`

---

### Phase 3: Create Admin Activity Log Page

**New files to create:**

#### 1. `Admin panel/Admin-panel/AD_Activitylog.html`
- Similar structure to `SA_Activitylog.html`
- Include filter section (action, user, date range)
- Include log entries display table

#### 2. `Admin panel/Admin-panel/java/AD_Activitylog.js`
- Reuse `SA_Activitylog_updated.js` logic adapted for Admin
- Functions needed:
  - `fetchActivityLogs()` - fetch from `activity_logs` table
  - `loadActivityLogs()` - main loader
  - `logActivity(action, requestId)` - insert log entry
  - `displayLogs()` - render logs
  - `populateUserFilter()`, `populateActionFilter()`, `applyFilters()`

#### 3. `Admin panel/Admin-panel/css/AD_Activitylog.css`
- Copy from `SA_Activitylog.css` for consistent styling

---

### Phase 4: Add Activity Logging to Admin

**Files to modify:**

#### 1. `Admin panel/Admin-panel/java/AD_REQ_IncomingRequest.js`
- Add `logActivity()` call in `markAsPending(requestId)` function
- Action: `"VRF Printed - Request Moved to Pending"` or `"Request Reviewed"`

#### 2. `Admin panel/Admin-panel/java/AD_pending.js`
- Add `logActivity()` call in `approveBtn.onclick`
  - Action: `"Request Accepted"`
- Add `logActivity()` call in `disapproveBtn.onclick`
  - Action: `"Request Rejected"`

---

### Phase 5: Add "Logs" Link to Admin Sidebar

**Files to modify (all Admin HTML pages with sidebar):**
- `Admin panel/Admin-panel/AdminDashboard.html`
- `Admin panel/Admin-panel/Admin_manage.html`
- `Admin panel/Admin-panel/Admincalendar.html`
- `Admin panel/Admin-panel/AdminVRF.html`
- `Admin panel/Admin-panel/Otheruser.html`
- `Admin panel/Admin-panel/AD_REQ_IncomingRequest.html`
- `Admin panel/Admin-panel/AD_Pending.html`
- `Admin panel/Admin-panel/AD_Appproved.html`
- `Admin panel/Admin-panel/Relevantdocuments.html`
- `Admin panel/Admin-panel/Slip.html`
- `Admin panel/Admin-panel/UDMfacility.html`

**Add this line after the "Manage" link:**
```html
<a href="AD_Activitylog.html">Logs</a>
```

---

### Phase 6: Add User Request Creation Logging (Optional Enhancement)

**File to modify:** `User panel/Javascript/VRF.js`

- Add `logActivity()` call after successful reservation insert
- Action: `"Reservation Request Created"`

**Note:** This requires the User panel to have access to the same `logActivity()` function. We may need to create a shared activity logging utility.

---

## Activity Actions Summary

| Action | When Logged | Who |
|--------|-------------|-----|
| `Reservation Request Created` | User submits new reservation | User |
| `Request Reviewed` | Admin/SuperAdmin prints VRF and moves to pending | Admin/SuperAdmin |
| `Request Accepted` | Admin/SuperAdmin clicks Accept | Admin/SuperAdmin |
| `Request Rejected` | Admin/SuperAdmin clicks Reject | Admin/SuperAdmin |

---

## Implementation Order

1. **Phase 1** - Fix rejection logic (SA_Pending.js, AD_pending.js)
2. **Phase 2** - Add logging to SuperAdmin (SA_REQ_IncomingRequest.js, SA_Pending.js)
3. **Phase 3** - Create Admin Activity Log page (AD_Activitylog.html, AD_Activitylog.js)
4. **Phase 4** - Add logging to Admin (AD_REQ_IncomingRequest.js, AD_pending.js)
5. **Phase 5** - Add Logs link to Admin sidebar (all Admin HTML pages)
6. **Phase 6** - User request creation logging (VRF.js) - Optional

---

## Files Summary

### New Files
- `Admin panel/Admin-panel/AD_Activitylog.html`
- `Admin panel/Admin-panel/java/AD_Activitylog.js`
- `Admin panel/Admin-panel/css/AD_Activitylog.css`

### Modified Files
- `SuperAdmin panel/SuperAdmin-panel/java/SA_REQ_IncomingRequest.js`
- `SuperAdmin panel/SuperAdmin-panel/java/SA_Pending.js`
- `Admin panel/Admin-panel/java/AD_REQ_IncomingRequest.js`
- `Admin panel/Admin-panel/java/AD_pending.js`
- All Admin HTML pages (sidebar update)