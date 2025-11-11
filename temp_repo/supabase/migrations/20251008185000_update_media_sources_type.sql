/*
  # Update Media Sources Type Constraint

  ## Changes
  - Add 'magazine' to the allowed types in media_sources table
  
  ## Security
  - No security changes needed
*/

-- Drop the existing constraint
ALTER TABLE media_sources DROP CONSTRAINT IF EXISTS media_sources_type_check;

-- Add the new constraint with magazine included
ALTER TABLE media_sources ADD CONSTRAINT media_sources_type_check 
  CHECK (type IN ('newspaper', 'tv', 'radio', 'online', 'social_media', 'magazine'));
