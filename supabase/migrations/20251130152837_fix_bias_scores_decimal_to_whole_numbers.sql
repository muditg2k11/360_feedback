/*
  # Fix Bias Scores - Convert Decimals to Whole Numbers

  1. Problem
    - Bias scores stored as decimals (0.5) instead of whole numbers (50)
    - UI expects values 0-100 but gets 0-1
    - Results in all scores showing as 0

  2. Solution
    - Convert all decimal bias scores to whole numbers by multiplying by 100
    - Update political_bias, regional_bias, sentiment_bias, etc.
    - Keep overall_score as-is (already correct)

  3. Changes
    - Update all existing ai_analyses records
    - Convert bias_indicators JSONB values
    - Multiply decimal scores by 100
*/

-- Fix all existing bias scores
UPDATE ai_analyses
SET bias_indicators = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            bias_indicators,
            '{political_bias}',
            to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'political_bias')::numeric * 100)))
          ),
          '{regional_bias}',
          to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'regional_bias')::numeric * 100)))
        ),
        '{sentiment_bias}',
        to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'sentiment_bias')::numeric * 100)))
      ),
      '{source_reliability_bias}',
      to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'source_reliability_bias')::numeric * 100)))
    ),
    '{representation_bias}',
    to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'representation_bias')::numeric * 100)))
  ),
  '{language_bias}',
  to_jsonb(LEAST(100, GREATEST(0, (bias_indicators->>'language_bias')::numeric * 100)))
)
WHERE bias_indicators IS NOT NULL
  AND (bias_indicators->>'political_bias')::numeric < 10; -- Only update if values look like decimals

-- Also update nested detailed_analysis scores
UPDATE ai_analyses
SET bias_indicators = jsonb_set(
  bias_indicators,
  '{detailed_analysis}',
  jsonb_build_object(
    'political', jsonb_set(
      bias_indicators->'detailed_analysis'->'political',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'political'->>'score')::numeric))
    ),
    'regional', jsonb_set(
      bias_indicators->'detailed_analysis'->'regional',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'regional'->>'score')::numeric))
    ),
    'sentiment', jsonb_set(
      bias_indicators->'detailed_analysis'->'sentiment',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'sentiment'->>'score')::numeric))
    ),
    'source_reliability', jsonb_set(
      bias_indicators->'detailed_analysis'->'source_reliability',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'source_reliability'->>'score')::numeric))
    ),
    'representation', jsonb_set(
      bias_indicators->'detailed_analysis'->'representation',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'representation'->>'score')::numeric))
    ),
    'language', jsonb_set(
      bias_indicators->'detailed_analysis'->'language',
      '{score}',
      to_jsonb(LEAST(100, (bias_indicators->'detailed_analysis'->'language'->>'score')::numeric))
    )
  )
)
WHERE bias_indicators IS NOT NULL
  AND bias_indicators->'detailed_analysis' IS NOT NULL;
