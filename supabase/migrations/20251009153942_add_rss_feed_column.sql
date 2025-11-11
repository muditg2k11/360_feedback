/*
  # Add RSS Feed Column to Media Sources

  1. Changes
    - Add `rss_feed` column to `media_sources` table to store RSS feed URLs
    - This enables real-time news scraping from RSS feeds
*/

ALTER TABLE media_sources 
ADD COLUMN IF NOT EXISTS rss_feed TEXT;
