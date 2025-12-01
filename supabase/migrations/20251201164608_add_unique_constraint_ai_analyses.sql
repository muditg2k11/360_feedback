/*
  # Add Unique Constraint to ai_analyses.feedback_id

  1. Changes
    - Add unique constraint on feedback_id column in ai_analyses table
    - This allows the detect-bias function to use ON CONFLICT properly

  2. Purpose
    - Fix the upsert error in detect-bias function
    - Ensure each feedback item can only have one analysis record
*/

-- First, remove any duplicate records (keep the most recent one)
DELETE FROM ai_analyses a
USING ai_analyses b
WHERE a.feedback_id = b.feedback_id
  AND a.created_at < b.created_at;

-- Add unique constraint on feedback_id
ALTER TABLE ai_analyses
ADD CONSTRAINT ai_analyses_feedback_id_unique UNIQUE (feedback_id);