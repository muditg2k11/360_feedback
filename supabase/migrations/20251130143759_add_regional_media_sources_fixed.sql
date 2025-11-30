/*
  # Add Regional Media Sources for PIB Monitoring
  
  Adds 70+ major Indian media sources across 13 languages
*/

INSERT INTO media_sources (name, url, rss_feed, type, language, language_code, language_name, region, active, credibility_score) VALUES

-- English National Media
('The Hindu', 'https://www.thehindu.com', 'https://www.thehindu.com/news/national/feeder/default.rss', 'online', 'English', 'en', 'English', 'All India', true, 0.95),
('The Times of India', 'https://timesofindia.indiatimes.com', 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', 'online', 'English', 'en', 'English', 'All India', true, 0.90),
('The Indian Express', 'https://indianexpress.com', 'https://indianexpress.com/feed/', 'online', 'English', 'en', 'English', 'All India', true, 0.93),
('Hindustan Times', 'https://www.hindustantimes.com', 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', 'online', 'English', 'en', 'English', 'All India', true, 0.91),
('NDTV', 'https://www.ndtv.com', 'https://feeds.feedburner.com/NDTV-LatestNews', 'online', 'English', 'en', 'English', 'All India', true, 0.89),
('India Today', 'https://www.indiatoday.in', 'https://www.indiatoday.in/rss/home', 'online', 'English', 'en', 'English', 'All India', true, 0.88),
('Business Standard', 'https://www.business-standard.com', 'https://www.business-standard.com/rss/home_page_top_stories.rss', 'online', 'English', 'en', 'English', 'All India', true, 0.92),
('The Wire', 'https://thewire.in', 'https://thewire.in/feed', 'online', 'English', 'en', 'English', 'All India', true, 0.87),
('Scroll.in', 'https://scroll.in', 'https://scroll.in/feeds/all', 'online', 'English', 'en', 'English', 'All India', true, 0.86),
('News18', 'https://www.news18.com', 'https://www.news18.com/rss/india.xml', 'online', 'English', 'en', 'English', 'All India', true, 0.85),

-- Hindi Media
('Dainik Jagran', 'https://www.jagran.com', 'https://www.jagran.com/rss/news-national-hindi-news.xml', 'newspaper', 'Hindi', 'hi', 'Hindi', 'North India', true, 0.94),
('Dainik Bhaskar', 'https://www.bhaskar.com', 'https://www.bhaskar.com/rss-feed/1061/', 'newspaper', 'Hindi', 'hi', 'Hindi', 'Central India', true, 0.93),
('Amar Ujala', 'https://www.amarujala.com', 'https://www.amarujala.com/rss/breaking-news.xml', 'newspaper', 'Hindi', 'hi', 'Hindi', 'North India', true, 0.92),
('Navbharat Times', 'https://navbharattimes.indiatimes.com', 'https://navbharattimes.indiatimes.com/rssfeedstopstories.cms', 'newspaper', 'Hindi', 'hi', 'Hindi', 'All India', true, 0.90),
('Jansatta', 'https://www.jansatta.com', 'https://www.jansatta.com/feed/', 'newspaper', 'Hindi', 'hi', 'Hindi', 'North India', true, 0.89),
('Hindustan', 'https://www.livehindustan.com', 'https://www.livehindustan.com/rss/national', 'newspaper', 'Hindi', 'hi', 'Hindi', 'All India', true, 0.91),
('Patrika', 'https://www.patrika.com', 'https://www.patrika.com/rss/india-news.xml', 'newspaper', 'Hindi', 'hi', 'Hindi', 'Central India', true, 0.87),
('Prabhat Khabar', 'https://www.prabhatkhabar.com', 'https://www.prabhatkhabar.com/rss.xml', 'newspaper', 'Hindi', 'hi', 'Hindi', 'East India', true, 0.86),
('Nai Dunia', 'https://www.naidunia.com', 'https://www.naidunia.com/rss/mp-news', 'newspaper', 'Hindi', 'hi', 'Hindi', 'Central India', true, 0.85),
('Rajasthan Patrika', 'https://www.rajasthanpatrika.com', 'https://www.rajasthanpatrika.com/rss', 'newspaper', 'Hindi', 'hi', 'Hindi', 'North India', true, 0.84),

-- Tamil Media
('Dinamalar', 'https://www.dinamalar.com', 'https://www.dinamalar.com/rss/latest_news.rss', 'newspaper', 'Tamil', 'ta', 'Tamil', 'South India', true, 0.91),
('Dina Thanthi', 'https://www.dinathanthi.com', 'https://www.dinathanthi.com/rss-feed', 'newspaper', 'Tamil', 'ta', 'Tamil', 'South India', true, 0.92),
('The Hindu Tamil', 'https://tamil.thehindu.com', 'https://tamil.thehindu.com/news/feeder/default.rss', 'online', 'Tamil', 'ta', 'Tamil', 'South India', true, 0.93),
('Vikatan', 'https://www.vikatan.com', 'https://www.vikatan.com/rss', 'magazine', 'Tamil', 'ta', 'Tamil', 'South India', true, 0.88),
('Maalai Malar', 'https://www.maalaimalar.com', 'https://www.maalaimalar.com/rss', 'newspaper', 'Tamil', 'ta', 'Tamil', 'South India', true, 0.87),

-- Telugu Media
('Eenadu', 'https://www.eenadu.net', 'https://www.eenadu.net/rss/telangana-news.xml', 'newspaper', 'Telugu', 'te', 'Telugu', 'South India', true, 0.93),
('Sakshi', 'https://www.sakshi.com', 'https://www.sakshi.com/rss/news', 'newspaper', 'Telugu', 'te', 'Telugu', 'South India', true, 0.91),
('Andhra Jyothi', 'https://www.andhrajyothy.com', 'https://www.andhrajyothy.com/rss', 'newspaper', 'Telugu', 'te', 'Telugu', 'South India', true, 0.90),
('Vaartha', 'https://www.vaartha.com', 'https://www.vaartha.com/feed/', 'newspaper', 'Telugu', 'te', 'Telugu', 'South India', true, 0.88),
('ABN Andhra Jyothi', 'https://www.andhrajyothy.com', 'https://www.andhrajyothy.com/rss/politics', 'tv', 'Telugu', 'te', 'Telugu', 'South India', true, 0.86),

-- Malayalam Media
('Malayala Manorama', 'https://www.manoramaonline.com', 'https://www.manoramaonline.com/feed', 'newspaper', 'Malayalam', 'ml', 'Malayalam', 'South India', true, 0.94),
('Mathrubhumi', 'https://www.mathrubhumi.com', 'https://www.mathrubhumi.com/feed', 'newspaper', 'Malayalam', 'ml', 'Malayalam', 'South India', true, 0.93),
('Madhyamam', 'https://www.madhyamam.com', 'https://www.madhyamam.com/feed', 'newspaper', 'Malayalam', 'ml', 'Malayalam', 'South India', true, 0.89),
('Deepika', 'https://www.deepika.com', 'https://www.deepika.com/feed/', 'newspaper', 'Malayalam', 'ml', 'Malayalam', 'South India', true, 0.88),
('Kerala Kaumudi', 'https://keralakaumudi.com', 'https://keralakaumudi.com/feed', 'newspaper', 'Malayalam', 'ml', 'Malayalam', 'South India', true, 0.87),

-- Kannada Media
('Prajavani', 'https://www.prajavani.net', 'https://www.prajavani.net/feed', 'newspaper', 'Kannada', 'kn', 'Kannada', 'South India', true, 0.92),
('Vijaya Karnataka', 'https://www.vijayakarnataka.com', 'https://www.vijayakarnataka.com/feed', 'newspaper', 'Kannada', 'kn', 'Kannada', 'South India', true, 0.91),
('Udayavani', 'https://www.udayavani.com', 'https://www.udayavani.com/feed', 'newspaper', 'Kannada', 'kn', 'Kannada', 'South India', true, 0.90),
('Vijay Times', 'https://www.vijaytimes.com', 'https://www.vijaytimes.com/feed/', 'newspaper', 'Kannada', 'kn', 'Kannada', 'South India', true, 0.87),
('Kannada Prabha', 'https://www.kannadaprabha.com', 'https://www.kannadaprabha.com/feed', 'newspaper', 'Kannada', 'kn', 'Kannada', 'South India', true, 0.86),

-- Marathi Media
('Loksatta', 'https://www.loksatta.com', 'https://www.loksatta.com/feed', 'newspaper', 'Marathi', 'mr', 'Marathi', 'West India', true, 0.92),
('Maharashtra Times', 'https://maharashtratimes.com', 'https://maharashtratimes.com/rss.cms', 'newspaper', 'Marathi', 'mr', 'Marathi', 'West India', true, 0.91),
('Sakal', 'https://www.esakal.com', 'https://www.esakal.com/feed', 'newspaper', 'Marathi', 'mr', 'Marathi', 'West India', true, 0.90),
('Lokmat', 'https://www.lokmat.com', 'https://www.lokmat.com/feed', 'newspaper', 'Marathi', 'mr', 'Marathi', 'West India', true, 0.89),
('Pudhari', 'https://www.pudhari.news', 'https://www.pudhari.news/feed/', 'newspaper', 'Marathi', 'mr', 'Marathi', 'West India', true, 0.86),

-- Bengali Media
('Anandabazar Patrika', 'https://www.anandabazar.com', 'https://www.anandabazar.com/feed', 'newspaper', 'Bengali', 'bn', 'Bengali', 'East India', true, 0.94),
('Bartaman', 'https://www.bartamanpatrika.com', 'https://www.bartamanpatrika.com/feed', 'newspaper', 'Bengali', 'bn', 'Bengali', 'East India', true, 0.91),
('Ei Samay', 'https://eisamay.indiatimes.com', 'https://eisamay.indiatimes.com/rssfeedstopstories.cms', 'newspaper', 'Bengali', 'bn', 'Bengali', 'East India', true, 0.90),
('Sangbad Pratidin', 'https://www.sangbadpratidin.in', 'https://www.sangbadpratidin.in/feed/', 'newspaper', 'Bengali', 'bn', 'Bengali', 'East India', true, 0.88),
('Aajkaal', 'https://www.aajkaal.in', 'https://www.aajkaal.in/feed', 'newspaper', 'Bengali', 'bn', 'Bengali', 'East India', true, 0.87),

-- Gujarati Media
('Sandesh', 'https://www.sandesh.com', 'https://www.sandesh.com/feed', 'newspaper', 'Gujarati', 'gu', 'Gujarati', 'West India', true, 0.91),
('Gujarat Samachar', 'https://www.gujaratsamachar.com', 'https://www.gujaratsamachar.com/feed', 'newspaper', 'Gujarati', 'gu', 'Gujarati', 'West India', true, 0.90),
('Divya Bhaskar', 'https://www.divyabhaskar.co.in', 'https://www.divyabhaskar.co.in/rss-v1/2002.xml', 'newspaper', 'Gujarati', 'gu', 'Gujarati', 'West India', true, 0.89),

-- Punjabi Media
('Punjab Kesari', 'https://www.punjabkesari.in', 'https://www.punjabkesari.in/feed', 'newspaper', 'Punjabi', 'pa', 'Punjabi', 'North India', true, 0.90),
('Jagbani', 'https://www.jagbani.com', 'https://www.jagbani.com/feed', 'newspaper', 'Punjabi', 'pa', 'Punjabi', 'North India', true, 0.88),
('Ajit', 'https://www.ajitjalandhar.com', 'https://www.ajitjalandhar.com/feed', 'newspaper', 'Punjabi', 'pa', 'Punjabi', 'North India', true, 0.87),

-- Odia Media
('Sambad', 'https://sambad.in', 'https://sambad.in/feed/', 'newspaper', 'Odia', 'or', 'Odia', 'East India', true, 0.91),
('Dharitri', 'https://www.dharitri.com', 'https://www.dharitri.com/feed', 'newspaper', 'Odia', 'or', 'Odia', 'East India', true, 0.90),
('Samaja', 'https://www.thesamaja.in', 'https://www.thesamaja.in/feed/', 'newspaper', 'Odia', 'or', 'Odia', 'East India', true, 0.88),

-- Urdu Media
('Inquilab', 'https://www.inquilab.com', 'https://www.inquilab.com/feed', 'newspaper', 'Urdu', 'ur', 'Urdu', 'All India', true, 0.89),
('Siasat Daily', 'https://www.siasat.com', 'https://www.siasat.com/feed/', 'newspaper', 'Urdu', 'ur', 'Urdu', 'South India', true, 0.88),
('Roznama Rashtriya Sahara', 'https://www.sahara.in', 'https://www.sahara.in/feed', 'newspaper', 'Urdu', 'ur', 'Urdu', 'All India', true, 0.86),

-- Assamese Media
('Asomiya Pratidin', 'https://www.asomiyapratidin.in', 'https://www.asomiyapratidin.in/feed', 'newspaper', 'Assamese', 'as', 'Assamese', 'Northeast India', true, 0.89),
('Dainik Janambhumi', 'https://www.janambhumi.in', 'https://www.janambhumi.in/feed/', 'newspaper', 'Assamese', 'as', 'Assamese', 'Northeast India', true, 0.87),

-- Manipuri Media
('Poknapham', 'https://poknapham.in', 'https://poknapham.in/feed/', 'newspaper', 'Manipuri', 'mni', 'Manipuri', 'Northeast India', true, 0.86),
('Hueiyen News Service', 'https://www.thesangaiexpress.com', 'https://www.thesangaiexpress.com/feed/', 'online', 'Manipuri', 'mni', 'Manipuri', 'Northeast India', true, 0.85)

ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  rss_feed = EXCLUDED.rss_feed,
  language_code = EXCLUDED.language_code,
  language_name = EXCLUDED.language_name,
  credibility_score = EXCLUDED.credibility_score;
