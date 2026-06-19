# Supabase Migration Guide - UDM Faculty Reservation System

## Overview

This guide provides step-by-step instructions for setting up a brand new Supabase project for the UDM Faculty Reservation System.

---

## Prerequisites

- A Supabase account ([supabase.com](https://supabase.com))
- Access to the Supabase Dashboard

---

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Select your organization or create new
   - **Name**: `UDM Faculty Reservation` (or your preferred name)
   - **Database Password**: Generate a strong password and SAVE IT
   - **Region**: Select closest region to your users (e.g., Southeast Asia)
4. Click **"Create new project"**
5. Wait for the project to be provisioned (2-3 minutes)

---

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy and save the following:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon/public key**: The long JWT token

These will replace the old values in your `.env` file.

---

## Step 3: Create Database Schema

### Option A: Using Supabase SQL Editor (Recommended)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `new_supabase_setup.sql`
4. Paste into the SQL Editor
5. Click **"Run"** to execute

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push the database schema
supabase db push
```

---

## Step 4: Update Your Application Configuration

Update your `.env` file with the new Supabase credentials:

```env
SUPABASE_URL=https://your-new-project-ref.supabase.co
SUPABASE_KEY=your-new-anon-key
```

Also update `supabaseConfig.js` if it has hardcoded values:

```javascript
const SUPABASE_URL = 'https://your-new-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-new-anon-key';
```

---

## Step 5: Verify Connection

1. Open your application in the browser
2. Try logging in with the default credentials:
   - **Admin**: `admin@udm.edu.ph` / `admin123`
   - **Super Admin**: `superadmin@udm.edu.ph` / `superadmin123`

---

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (super_admin, admin, faculty, student_organization) |
| `reservations` | Facility reservation requests with status tracking |
| `activity_logs` | System activity logging for audit trail |
| `manual_events` | Manual calendar events (non-reservation) |

### User ID Prefixes

| Role | Prefix | Example |
|------|--------|---------|
| Super Admin | SA | SA001, SA002 |
| Admin | A | A001, A002 |
| Faculty | F | F001, F002 |
| Student Organization | S | S001, S002 |

### Reservation Statuses

| Status | Description |
|--------|-------------|
| `request` | Initial submission |
| `pending` | Under review |
| `approved` | Confirmed |
| `rejected` | Declined |
| `cancelled` | Cancelled by user |

---

## Post-Setup Checklist

- [ ] Change default admin passwords immediately
- [ ] Create additional admin/super_admin accounts
- [ ] Test user registration/login
- [ ] Test reservation creation flow
- [ ] Test admin approval workflow
- [ ] Verify calendar displays correctly
- [ ] Check activity logs are being recorded

---

## Troubleshooting

### Connection Errors

If you see connection errors:
1. Verify `.env` file has correct URL and key
2. Check browser console for specific errors
3. Ensure Supabase project is not paused

### Permission Errors

If you get permission errors:
1. Ensure RLS (Row Level Security) is disabled, OR
2. Create appropriate policies for your tables

### Table Not Found

If tables are not found:
1. Verify SQL schema was executed successfully
2. Check table names match exactly (case-sensitive)

---

## Files Created for Migration

| File | Purpose |
|------|---------|
| `new_supabase_setup.sql` | Complete database schema with all tables, indexes, and initial admin accounts |
| `SUPABASE_MIGRATION_GUIDE.md` | This guide |

---

## Need Help?

If you encounter issues not covered here:
1. Check Supabase documentation: https://supabase.com/docs
2. Review your browser's developer console (F12)
3. Check Supabase project status in the dashboard
