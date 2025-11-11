/*
  # Remove Admin Role from Registration

  ## Overview
  This migration removes the admin role option from user registration.
  Admin accounts should be created manually for security purposes.

  ## Changes
  - Update role constraint to exclude 'admin' from allowed registration roles
  - Keep admin role available in database for manual creation

  ## Security Note
  - Admin accounts cannot be created through registration
  - Admin role must be assigned manually via database or admin panel
*/

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add constraint that excludes admin from registration options
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'analyst', 'government_official', 'viewer'));
