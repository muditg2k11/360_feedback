/*
  # Create Feedback System Tables

  ## Overview
  This migration creates all necessary tables for the 360° Feedback System to store media sources,
  feedback items, AI analysis results, performance metrics, and reports.

  ## New Tables

  ### 1. `media_sources`
  Stores information about media outlets being monitored
  - `id` (uuid, primary key)
  - `name` (text) - Name of the media source
  - `type` (text) - Type: newspaper, tv, radio, online, social_media
  - `language` (text) - Primary language
  - `region` (text) - Geographic region
  - `url` (text) - Website URL
  - `credibility_score` (numeric) - Score between 0 and 1
  - `active` (boolean) - Whether source is actively monitored
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `feedback_items`
  Stores collected feedback/news items from media sources
  - `id` (uuid, primary key)
  - `source_id` (uuid, foreign key to media_sources)
  - `title` (text) - Headline/title
  - `content` (text) - Full content
  - `original_language` (text)
  - `translated_content` (text, nullable)
  - `region` (text) - Region mentioned
  - `category` (text) - Topic category
  - `status` (text) - processing, analyzed, archived
  - `collected_at` (timestamptz)
  - `published_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ### 3. `ai_analyses`
  Stores AI analysis results for feedback items
  - `id` (uuid, primary key)
  - `feedback_id` (uuid, foreign key to feedback_items)
  - `sentiment_score` (numeric) - Score between -1 and 1
  - `sentiment_label` (text) - positive, negative, neutral, mixed
  - `topics` (text[]) - Array of identified topics
  - `entities` (jsonb) - Named entities found
  - `keywords` (text[]) - Key phrases
  - `language_detected` (text)
  - `confidence_score` (numeric)
  - `bias_indicators` (jsonb) - Bias analysis results
  - `processed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 4. `performance_metrics`
  Aggregated performance metrics by period and region
  - `id` (uuid, primary key)
  - `period_start` (date)
  - `period_end` (date)
  - `department` (text)
  - `region` (text)
  - `total_feedback` (integer)
  - `positive_count` (integer)
  - `negative_count` (integer)
  - `neutral_count` (integer)
  - `mixed_count` (integer)
  - `avg_sentiment` (numeric)
  - `top_topics` (jsonb)
  - `top_entities` (jsonb)
  - `trend_direction` (text) - improving, declining, stable
  - `created_at` (timestamptz)

  ### 5. `reports`
  Generated reports and insights
  - `id` (uuid, primary key)
  - `title` (text)
  - `report_type` (text) - daily, weekly, monthly, quarterly, custom
  - `period_start` (date)
  - `period_end` (date)
  - `departments` (text[])
  - `regions` (text[])
  - `summary` (text)
  - `insights` (jsonb)
  - `recommendations` (jsonb)
  - `created_by` (uuid, foreign key to users)
  - `status` (text) - draft, published, archived
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Authenticated users can read all data
  - Only admins and analysts can insert/update/delete data
  - Users can create and update their own reports
*/

-- Create media_sources table
CREATE TABLE IF NOT EXISTS media_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('newspaper', 'tv', 'radio', 'online', 'social_media')),
  language text NOT NULL,
  region text NOT NULL,
  url text,
  credibility_score numeric CHECK (credibility_score >= 0 AND credibility_score <= 1),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE media_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view media sources"
  ON media_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert media sources"
  ON media_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins and analysts can update media sources"
  ON media_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins can delete media sources"
  ON media_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create feedback_items table
CREATE TABLE IF NOT EXISTS feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES media_sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  original_language text NOT NULL,
  translated_content text,
  region text NOT NULL,
  category text,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'analyzed', 'archived')),
  collected_at timestamptz DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feedback items"
  ON feedback_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert feedback items"
  ON feedback_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins and analysts can update feedback items"
  ON feedback_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins can delete feedback items"
  ON feedback_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create ai_analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid REFERENCES feedback_items(id) ON DELETE CASCADE,
  sentiment_score numeric CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label text CHECK (sentiment_label IN ('positive', 'negative', 'neutral', 'mixed')),
  topics text[],
  entities jsonb DEFAULT '[]'::jsonb,
  keywords text[],
  language_detected text,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  bias_indicators jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analyses"
  ON ai_analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert analyses"
  ON ai_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Admins and analysts can update analyses"
  ON ai_analyses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  department text,
  region text NOT NULL,
  total_feedback integer DEFAULT 0,
  positive_count integer DEFAULT 0,
  negative_count integer DEFAULT 0,
  neutral_count integer DEFAULT 0,
  mixed_count integer DEFAULT 0,
  avg_sentiment numeric,
  top_topics jsonb DEFAULT '[]'::jsonb,
  top_entities jsonb DEFAULT '[]'::jsonb,
  trend_direction text CHECK (trend_direction IN ('improving', 'declining', 'stable')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view performance metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can manage performance metrics"
  ON performance_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'analyst')
    )
  );

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  departments text[],
  regions text[],
  summary text,
  insights jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published reports"
  ON reports FOR SELECT
  TO authenticated
  USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update any report"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_items_source_id ON feedback_items(source_id);
CREATE INDEX IF NOT EXISTS idx_feedback_items_status ON feedback_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_items_region ON feedback_items(region);
CREATE INDEX IF NOT EXISTS idx_feedback_items_collected_at ON feedback_items(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_feedback_id ON ai_analyses(feedback_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_sentiment_label ON ai_analyses(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
