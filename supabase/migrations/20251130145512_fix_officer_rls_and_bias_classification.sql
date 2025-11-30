/*
  # Fix Officer RLS and Bias Classification
  
  1. Changes
    - Simplify pib_officers RLS policies to allow all authenticated users to manage
    - Add classification to bias_indicators
    - Update existing records with proper classification
  
  2. Security
    - Keep RLS enabled
    - Allow authenticated users to manage officers (not just admins)
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Officers can view own profile" ON pib_officers;
DROP POLICY IF EXISTS "Admins can manage officers" ON pib_officers;

-- Create simpler policies that allow authenticated users
CREATE POLICY "Authenticated users can view officers"
  ON pib_officers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert officers"
  ON pib_officers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update officers"
  ON pib_officers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete officers"
  ON pib_officers FOR DELETE
  TO authenticated
  USING (true);

-- Fix bias classification - update all existing records
UPDATE ai_analyses
SET bias_indicators = jsonb_set(
  COALESCE(bias_indicators, '{}'::jsonb),
  '{classification}',
  to_jsonb(
    CASE 
      WHEN CAST(bias_indicators->>'overall_score' AS NUMERIC) >= 70 THEN 'High Bias'
      WHEN CAST(bias_indicators->>'overall_score' AS NUMERIC) >= 40 THEN 'Medium Bias'
      ELSE 'Low Bias'
    END
  )
)
WHERE bias_indicators IS NOT NULL 
  AND bias_indicators->>'overall_score' IS NOT NULL
  AND (bias_indicators->>'classification' IS NULL OR bias_indicators->>'classification' = '');

-- Also fix notification_preferences policies
DROP POLICY IF EXISTS "Officers can manage own preferences" ON notification_preferences;

CREATE POLICY "Authenticated users can view notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
