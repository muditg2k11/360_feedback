/*
  # Fix trigger issue on feedback_items table

  1. Changes
    - Drop the update_updated_at_column trigger if it exists on feedback_items
    - This trigger references a non-existent updated_at column
*/

DROP TRIGGER IF EXISTS update_feedback_items_updated_at ON feedback_items;
