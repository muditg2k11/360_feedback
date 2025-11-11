/*
  # Allow Public Read Access

  ## Changes
  - Add policies to allow anonymous users to read media_sources and feedback_items
  - This enables the app to display data even before users log in
  - Write operations still require authentication

  ## Security
  - Public can only SELECT (read) data
  - INSERT, UPDATE, DELETE still require authentication and proper roles
*/

-- Allow public read access to media_sources
CREATE POLICY "Public users can view media sources"
  ON media_sources FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to feedback_items  
CREATE POLICY "Public users can view feedback items"
  ON feedback_items FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to ai_analyses
CREATE POLICY "Public users can view analyses"
  ON ai_analyses FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to performance_metrics
CREATE POLICY "Public users can view performance metrics"
  ON performance_metrics FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to published reports
CREATE POLICY "Public users can view published reports"
  ON reports FOR SELECT
  TO anon
  USING (status = 'published');
