/*
  # Allow Public Read Access

  ## Changes
  - Add policies to allow anonymous users to read data tables
  - This enables the app to display data even before users log in
  - Write operations still require authentication

  ## Security
  - Public can only SELECT (read) data
  - INSERT, UPDATE, DELETE still require authentication and proper roles
*/

CREATE POLICY "Public users can view media sources"
  ON media_sources FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can view feedback items"
  ON feedback_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can view analyses"
  ON ai_analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can view performance metrics"
  ON performance_metrics FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can view published reports"
  ON reports FOR SELECT
  TO anon
  USING (status = 'published');
