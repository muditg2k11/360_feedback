/*
  # Update Media Sources Type Constraint

  ## Changes
  - Add 'magazine' to the allowed types in media_sources table
  
  ## Security
  - No security changes needed
*/

ALTER TABLE media_sources DROP CONSTRAINT IF EXISTS media_sources_type_check;

ALTER TABLE media_sources ADD CONSTRAINT media_sources_type_check 
  CHECK (type IN ('newspaper', 'tv', 'radio', 'online', 'social_media', 'magazine'));
