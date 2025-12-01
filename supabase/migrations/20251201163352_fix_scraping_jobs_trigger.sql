/*
  # Fix Scraping Jobs Trigger Issue

  1. Changes
    - Drop the update_updated_at_column trigger from scraping_jobs table
    - Add updated_at column to scraping_jobs table
    - Recreate the trigger
    - Clean up stuck jobs in 'running' status

  2. Purpose
    - Fix the trigger error preventing updates to scraping_jobs
    - Clean up orphaned jobs that are stuck in running state
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_jobs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE scraping_jobs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_scraping_jobs_updated_at ON scraping_jobs;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'scraping_jobs' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.updated_at = now();
    END IF;
    RETURN NEW;
  END IF;
  
  -- For other tables that have updated_at column
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_scraping_jobs_updated_at
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Clean up stuck jobs (older than 10 minutes)
UPDATE scraping_jobs 
SET 
  status = 'failed', 
  error_message = 'Job timed out - exceeded maximum execution time',
  completed_at = now(),
  updated_at = now()
WHERE 
  status = 'running' 
  AND started_at < now() - interval '10 minutes';