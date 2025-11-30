/*
  # PIB Comprehensive Features - Government Departments, Officers, and Notifications

  ## New Tables
  
  ### government_departments
  - Stores all government ministries and departments
  - Fields: name, short_name, keywords for auto-categorization, contact info
  - Used for categorizing articles by relevant government body
  
  ### pib_officers
  - Stores PIB officers responsible for each department
  - Fields: name, email, phone, department assignment, notification preferences
  - Enables real-time alerts to concerned officers
  
  ### notification_preferences
  - Stores officer notification settings
  - Fields: channels (SMS/Email/Push), thresholds, quiet hours
  - Controls when and how officers receive alerts
  
  ### notification_log
  - Tracks all notifications sent
  - Fields: officer, article, channel, delivery status, timestamp
  - Provides audit trail for notifications
  
  ### article_translations
  - Stores translations of articles to English
  - Fields: original language, translated content, confidence score
  - Enables officers to read regional language content
  
  ### epaper_clippings
  - Stores scanned e-paper news clippings
  - Fields: image URL, newspaper name, page number, edition, coordinates
  - Supports OCR-based e-paper monitoring
  
  ### youtube_videos
  - Stores YouTube video metadata and analysis
  - Fields: channel, video ID, title, description, view count, sentiment
  - Enables monitoring of YouTube channels
  
  ## Schema Updates
  
  - Add language support columns to media_sources
  - Add department categorization to feedback_items
  - Add clipping reference to feedback_items
  - Add notification tracking fields
  
  ## Security
  
  - Enable RLS on all new tables
  - Create policies for authenticated access
  - Restrict officer data to admins and self
*/

-- 1. Government Departments Table
CREATE TABLE IF NOT EXISTS government_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  parent_department_id UUID REFERENCES government_departments(id),
  hierarchy_level INT DEFAULT 1,
  contact_email TEXT,
  contact_phone TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE government_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read departments"
  ON government_departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON government_departments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Insert major government departments with keywords
INSERT INTO government_departments (name, short_name, keywords, hierarchy_level) VALUES
('Prime Minister''s Office', 'PMO', ARRAY['prime minister', 'PM', 'Modi', 'PMO', 'government initiatives', 'cabinet'], 1),
('Ministry of Home Affairs', 'MHA', ARRAY['home affairs', 'internal security', 'police', 'law and order', 'naxal', 'terrorism', 'border', 'immigration', 'citizenship'], 1),
('Ministry of External Affairs', 'MEA', ARRAY['foreign affairs', 'diplomacy', 'embassy', 'international relations', 'bilateral', 'foreign policy', 'consulate', 'visa'], 1),
('Ministry of Defence', 'MoD', ARRAY['defence', 'army', 'navy', 'air force', 'military', 'soldier', 'war', 'border security', 'weapon', 'defense'], 1),
('Ministry of Finance', 'MoF', ARRAY['finance', 'economy', 'budget', 'taxation', 'GST', 'fiscal policy', 'banking', 'RBI', 'fiscal deficit', 'revenue'], 1),
('Ministry of Health and Family Welfare', 'MoHFW', ARRAY['health', 'hospital', 'doctor', 'medicine', 'vaccine', 'covid', 'disease', 'healthcare', 'AIIMS', 'pandemic'], 1),
('Ministry of Education', 'MoE', ARRAY['education', 'school', 'university', 'student', 'teacher', 'learning', 'examination', 'UGC', 'CBSE', 'IIT'], 1),
('Ministry of Agriculture & Farmers Welfare', 'MoA', ARRAY['agriculture', 'farmer', 'crop', 'farming', 'MSP', 'kisan', 'irrigation', 'fertilizer', 'harvest'], 1),
('Ministry of Railways', 'MoR', ARRAY['railway', 'train', 'station', 'tracks', 'passengers', 'Indian Railways', 'vande bharat', 'metro'], 1),
('Ministry of Road Transport & Highways', 'MoRTH', ARRAY['road', 'highway', 'transport', 'vehicle', 'traffic', 'national highway', 'toll', 'expressway'], 1),
('Ministry of Electronics & IT', 'MeitY', ARRAY['technology', 'digital', 'internet', 'IT', 'cyber', 'electronics', 'digital India', 'UIDAI', 'aadhaar'], 1),
('Ministry of Environment, Forest & Climate Change', 'MoEFCC', ARRAY['environment', 'climate', 'forest', 'wildlife', 'pollution', 'green', 'carbon', 'emission'], 1),
('Ministry of Power', 'MoP', ARRAY['power', 'electricity', 'energy', 'coal', 'renewable energy', 'solar', 'grid', 'hydro'], 1),
('Ministry of Commerce & Industry', 'MoCI', ARRAY['commerce', 'industry', 'trade', 'export', 'import', 'manufacturing', 'startup', 'business'], 1),
('Ministry of Law & Justice', 'MoLJ', ARRAY['law', 'justice', 'court', 'judge', 'legal', 'Supreme Court', 'judiciary', 'verdict'], 1),
('Ministry of Social Justice & Empowerment', 'MoSJE', ARRAY['social justice', 'empowerment', 'SC/ST', 'disability', 'welfare scheme', 'reservation'], 1),
('Ministry of Rural Development', 'MoRD', ARRAY['rural development', 'village', 'MGNREGA', 'rural', 'panchayat', 'gram sabha'], 1),
('Ministry of Urban Affairs', 'MoUA', ARRAY['urban', 'city', 'smart city', 'metro', 'municipal', 'housing', 'urban planning'], 1),
('Ministry of Women & Child Development', 'MoWCD', ARRAY['women', 'child', 'anganwadi', 'girl child', 'women empowerment', 'Beti Bachao', 'maternity'], 1),
('Ministry of Labour & Employment', 'MoLE', ARRAY['labour', 'employment', 'worker', 'job', 'unemployment', 'EPFO', 'minimum wage', 'labor'], 1)
ON CONFLICT (name) DO NOTHING;

-- 2. PIB Officers Table
CREATE TABLE IF NOT EXISTS pib_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  designation TEXT,
  department_id UUID REFERENCES government_departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pib_officers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can view own profile"
  ON pib_officers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'analyst')
  ));

CREATE POLICY "Admins can manage officers"
  ON pib_officers FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- 3. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES pib_officers(id) ON DELETE CASCADE,
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  sentiment_threshold FLOAT DEFAULT -0.3,
  bias_threshold FLOAT DEFAULT 60,
  languages TEXT[] DEFAULT ARRAY['en'],
  enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(officer_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pib_officers WHERE pib_officers.id = officer_id AND pib_officers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pib_officers WHERE pib_officers.id = officer_id AND pib_officers.user_id = auth.uid()
  ));

-- 4. Notification Log Table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES pib_officers(id),
  feedback_id UUID REFERENCES feedback_items(id),
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can view own notifications"
  ON notification_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pib_officers WHERE pib_officers.id = officer_id AND pib_officers.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'analyst')
  ));

-- 5. Article Translations Table
CREATE TABLE IF NOT EXISTS article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL DEFAULT 'en',
  translated_title TEXT,
  translated_content TEXT,
  translation_service TEXT DEFAULT 'google',
  confidence_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feedback_id, target_language)
);

ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON article_translations FOR SELECT
  TO authenticated
  USING (true);

-- 6. E-Paper Clippings Table
CREATE TABLE IF NOT EXISTS epaper_clippings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE,
  newspaper_name TEXT NOT NULL,
  edition TEXT,
  page_number INT,
  clipping_image_url TEXT,
  clipping_coordinates JSONB,
  scan_date DATE,
  ocr_confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE epaper_clippings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clippings"
  ON epaper_clippings FOR SELECT
  TO authenticated
  USING (true);

-- 7. YouTube Videos Table
CREATE TABLE IF NOT EXISTS youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMPTZ,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  thumbnail_url TEXT,
  duration TEXT,
  transcript TEXT,
  sentiment_score FLOAT,
  sentiment_label TEXT,
  department_id UUID REFERENCES government_departments(id),
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read videos"
  ON youtube_videos FOR SELECT
  TO authenticated
  USING (true);

-- 8. Update media_sources for language support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_sources' AND column_name = 'language_code'
  ) THEN
    ALTER TABLE media_sources
    ADD COLUMN language_code TEXT DEFAULT 'en',
    ADD COLUMN language_name TEXT DEFAULT 'English',
    ADD COLUMN is_epaper BOOLEAN DEFAULT false,
    ADD COLUMN epaper_url TEXT,
    ADD COLUMN youtube_channel_id TEXT;
  END IF;
END $$;

-- 9. Update feedback_items for department categorization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_items' AND column_name = 'primary_department_id'
  ) THEN
    ALTER TABLE feedback_items
    ADD COLUMN primary_department_id UUID REFERENCES government_departments(id),
    ADD COLUMN related_departments UUID[],
    ADD COLUMN detected_language TEXT,
    ADD COLUMN language_confidence FLOAT,
    ADD COLUMN has_clipping BOOLEAN DEFAULT false,
    ADD COLUMN tonality_confidence FLOAT;
  END IF;
END $$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_primary_dept ON feedback_items(primary_department_id);
CREATE INDEX IF NOT EXISTS idx_feedback_related_depts ON feedback_items USING GIN(related_departments);
CREATE INDEX IF NOT EXISTS idx_feedback_language ON feedback_items(detected_language);
CREATE INDEX IF NOT EXISTS idx_notification_log_officer ON notification_log(officer_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_feedback ON notification_log(feedback_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channel ON youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_department ON youtube_videos(department_id);

-- 11. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_departments_updated_at'
  ) THEN
    CREATE TRIGGER update_departments_updated_at
      BEFORE UPDATE ON government_departments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_officers_updated_at'
  ) THEN
    CREATE TRIGGER update_officers_updated_at
      BEFORE UPDATE ON pib_officers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_prefs_updated_at'
  ) THEN
    CREATE TRIGGER update_notification_prefs_updated_at
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
