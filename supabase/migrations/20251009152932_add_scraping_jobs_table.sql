/*
  # Add Scraping Jobs Table

  ## Overview
  This migration adds a table to track news scraping jobs and their execution status.

  ## New Tables

  ### `scraping_jobs` - Tracks automated scraping jobs
  - `id` (uuid, primary key)
  - `source_id` (uuid, foreign key) - The media source being scraped
  - `job_type` (text) - Type: scheduled, manual, test
  - `status` (text) - Status: pending, running, completed, failed
  - `articles_found` (integer) - Number of articles discovered
  - `articles_saved` (integer) - Number successfully saved
  - `error_message` (text) - Error details if failed
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on scraping_jobs table
  - Authenticated users can view jobs
  - Admins and analysts can create and update jobs
*/

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES media_sources(id) ON DELETE CASCADE,
  job_type text DEFAULT 'scheduled' CHECK (job_type IN ('scheduled', 'manual', 'test')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  articles_found integer DEFAULT 0,
  articles_saved integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scraping jobs"
  ON scraping_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert scraping jobs"
  ON scraping_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins and analysts can update scraping jobs"
  ON scraping_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_items' AND column_name = 'url'
  ) THEN
    ALTER TABLE feedback_items ADD COLUMN url text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_source_id ON scraping_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);
