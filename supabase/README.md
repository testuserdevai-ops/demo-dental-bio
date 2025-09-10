# Supabase Database Trigger Setup

This directory contains the database migration to automatically insert user data into the `public.users` table when a new user is created in `auth.users`.

## Migration File

The file `20240101000000_create_user_trigger.sql` contains:

1. **Function `handle_new_user()`**: Extracts user metadata from `auth.users` and inserts it into `public.users`
2. **Trigger `on_auth_user_created`**: Fires after a new user is inserted into `auth.users`

## How to Deploy

### Option 1: Using Supabase CLI

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Run the migration:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20240101000000_create_user_trigger.sql`
4. Execute the SQL

## What the Trigger Does

When a new user signs up through `supabase.auth.signUp()`, the trigger automatically:

- Extracts all user metadata (username, first_name, last_name, etc.)
- Inserts the data into the `public.users` table
- Sets default values for `subscription_status` and timestamps
- Handles data type conversions (birthday to date, trial_end to timestamp)

## Changes Made to Application

1. **`app/api/register/route.ts`**: Removed manual user insertion logic
2. **`app/register/confirm/page.tsx`**: 
   - Removed duplicate user check
   - Removed manual user insertion
   - Now only updates `time_registered` and `location_registered` fields

## Benefits

- **Automatic**: No need to manually insert user data
- **Consistent**: Ensures all user data is properly inserted
- **Reliable**: Database-level trigger ensures data integrity
- **Cleaner Code**: Removes duplicate insertion logic from application

## Troubleshooting

If the trigger doesn't work:

1. Check that the function and trigger were created successfully
2. Verify that the `public.users` table has all the required columns
3. Check the Supabase logs for any errors
4. Ensure the user has proper permissions to insert into `public.users` 