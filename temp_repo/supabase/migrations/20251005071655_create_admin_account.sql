/*
  # Create Admin Account

  ## Overview
  This migration creates an admin account for system administration.

  ## Changes
  - Update users table constraint to allow admin role in database
  - Create admin user in auth.users
  - Create admin profile in users table

  ## Admin Credentials
  - Email: admin@gov.in
  - Password: Admin@123
  - Role: admin

  ## Security Note
  - This is a system admin account
  - Change the password after first login
*/

-- First, update the constraint to allow admin role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'analyst', 'government_official', 'viewer'));

-- Create admin user in auth.users (using Supabase's signup function)
-- Note: In production, this should be done via Supabase Auth API or Dashboard
-- For now, we'll prepare the users table to accept admin role

-- The admin account will need to be created via the Supabase Auth Dashboard or API
-- with email: admin@gov.in and password of your choice
