/*
  # Create Users Table and Authentication Setup

  ## Overview
  This migration sets up the user management system for the 360-Degree Feedback application,
  allowing users to register and manage their accounts.

  ## New Tables
  
  ### `users` table
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique, not null) - User email address
  - `full_name` (text, not null) - User's full name
  - `role` (text, not null) - User role (analyst, government_official, viewer)
  - `department` (text) - User's department
  - `designation` (text) - User's job designation
  - `region` (text) - User's assigned region
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - Enable RLS on the users table
  - Authenticated users can read all user profiles
  - Users can only update their own profile
  - Only admins can delete users (handled via backend/admin panel)
  
  ### Constraints
  - Email must be unique
  - Role must be one of: analyst, government_official, viewer (admin excluded from registration)
  
  ## Notes
  - Admin accounts cannot be created through registration
  - New users default to 'viewer' role which can be upgraded by admins
  - Uses Supabase Auth for authentication
  - Profile data stored in public.users table
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('analyst', 'government_official', 'viewer')),
  department text,
  designation text,
  region text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all user profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own profile (during registration)
CREATE POLICY "Users can create their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own profile even when not fully authenticated
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
