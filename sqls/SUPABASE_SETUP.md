# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for the Cocoa & Chocolate Quality Competition application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## Step 1: Environment Variables

1. Copy your Supabase project URL and anon key from your Supabase dashboard
2. Update the `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Step 2: Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` into the SQL Editor
4. Execute the SQL script to create the necessary tables and policies

### If you already have an existing profiles table:

1. Run the `supabase-migration.sql` script instead to add the `is_verified` field
2. This will safely add the new column without affecting existing data

## Step 3: Storage Setup

The schema script automatically creates a storage bucket called `certification` for evaluator document uploads. No additional setup is required.

## Step 4: Authentication Configuration

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure the following settings:

### Site URL

Set your site URL (e.g., `http://localhost:8081` for development)

### **CRITICAL: Disable Email Confirmation**

**This is required for registration to work properly:**

1. Go to Authentication > Settings
2. Scroll down to "Email Auth" section
3. **Turn OFF "Enable email confirmations"**
4. Save the settings

Without this step, users will get "Email not confirmed" errors when trying to login after registration.

### Email Templates (Optional)

You can customize the email templates for:

- Confirm signup
- Reset password
- Magic link

### Providers (Optional)

Enable additional auth providers if needed (Google, GitHub, etc.)

## Step 5: Row Level Security

The schema script automatically enables Row Level Security (RLS) and creates the necessary policies. Users can only:

- View and edit their own profile
- Upload, view, and manage their own documents
- Access their own data

## Step 6: Testing

### Registration Flow:

1. Start your development server: `npm run dev`
2. Try registering a new account - **you will NOT be automatically logged in**
3. Registration creates account but sets `is_verified = false`
4. User is redirected to login page with approval message
5. For evaluator accounts, test document upload functionality during registration

### Login Testing:

1. **Demo accounts** - Work immediately (always verified)
2. **New registered accounts** - Will show "account not approved" message
3. **To test new accounts** - Manually set `is_verified = true` in database
4. **Admin approval** - Required for all new registrations

### Manual Account Approval (for testing):

```sql
-- Approve a specific user
UPDATE public.profiles
SET is_verified = true
WHERE email = 'user@example.com';

-- Approve all pending users (for testing)
UPDATE public.profiles
SET is_verified = true
WHERE is_verified = false;
```

## Demo Accounts

The application includes demo accounts that work without Supabase:

- `test.admin@gmail.com` - Administrator
- `test.director@gmail.com` - Director
- `test.judge@gmail.com` - Judge
- `test.participant@gmail.com` - Participant
- `test.evaluator@gmail.com` - Evaluator

Password for all demo accounts: `zxcasdQWE123!@#`

## Database Schema

### Tables Created

1. **profiles** - User profile information

   - `id` (UUID, references auth.users)
   - `email` (TEXT, unique)
   - `name` (TEXT)
   - `phone` (TEXT, optional)
   - `role` (TEXT, enum: admin/director/judge/participant/evaluator)
   - `is_verified` (BOOLEAN, default: FALSE) - **Requires admin approval**
   - `created_at`, `updated_at` (TIMESTAMP)

2. **evaluator_documents** - Document uploads for evaluators
   - `id` (UUID, primary key)
   - `user_id` (UUID, references profiles)
   - `file_name` (TEXT)
   - `file_path` (TEXT)
   - `file_size` (INTEGER)
   - `file_type` (TEXT)
   - `status` (TEXT, enum: pending/approved/rejected)
   - `uploaded_at` (TIMESTAMP)

### Storage Buckets

1. **certification** - For evaluator credential uploads
   - Private bucket with RLS policies
   - Users can only access their own documents

## Features Implemented

### Authentication

- ✅ User registration with Supabase Auth
- ✅ **Admin approval required** - New users cannot login until verified
- ✅ User login with email/password (verified users only)
- ✅ Demo account fallback (always verified)
- ✅ Automatic profile creation on signup
- ✅ Session management
- ✅ Loading states
- ✅ Account verification system

### Document Upload (Evaluators)

- ✅ File upload to Supabase Storage
- ✅ File validation (type, size)
- ✅ Metadata storage in database
- ✅ Document management (view, remove)
- ✅ Status tracking (pending/approved/rejected)

### Security

- ✅ Row Level Security enabled
- ✅ User-specific data access
- ✅ Secure file storage
- ✅ Input validation

## Troubleshooting

### Common Issues

1. **Environment variables not loading**

   - Make sure `.env` file is in the project root
   - Restart the development server after changing env vars
   - Check that variable names start with `VITE_`

2. **Database connection errors**

   - Verify your Supabase URL and key are correct
   - Check that the database schema has been applied
   - Ensure RLS policies are created

3. **Registration errors**

   - **"duplicate key value violates unique constraint"**: This happens when trying to register the same email twice. Delete the existing user from Supabase Auth dashboard first.
   - **"Email not confirmed"**: This is the most common issue. See solutions below.
   - **Phone number not saving**: Check that the profile creation includes the phone field

4. **"Email not confirmed" Error - CRITICAL FIX**

   **Option 1 (Recommended): Disable Email Confirmations**

   1. Go to Supabase Dashboard > Authentication > Settings
   2. Scroll to "Email Auth" section
   3. Turn OFF "Enable email confirmations"
   4. Save settings
   5. Try logging in again

   **Option 2: Manual Email Confirmation (if Option 1 doesn't work)**

   1. Go to Supabase Dashboard > SQL Editor
   2. Run this query (replace with actual email):

   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email = 'your@email.com'
   AND email_confirmed_at IS NULL;
   ```

   3. Try logging in again

   **Option 3: Use the provided script**

   - Run the `manual-email-confirm.sql` script in SQL Editor

5. **File upload errors**

   - Check that the `certification` storage bucket exists
   - Verify storage policies are applied
   - Ensure file types and sizes meet requirements

6. **Authentication issues**
   - Check Supabase Auth settings
   - Verify site URL is configured correctly
   - **Make sure email confirmations are disabled**
   - Test with demo accounts first

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Review the Supabase dashboard logs
3. Verify all setup steps were completed
4. Test with demo accounts to isolate issues

## Production Deployment

For production deployment:

1. Update environment variables with production Supabase credentials
2. Configure proper site URLs in Supabase Auth settings
3. Set up email templates for production
4. Consider enabling additional security features
5. Set up monitoring and logging
