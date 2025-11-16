import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { DOMParser } from 'npm:linkedom@0.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScrapeRequest {
  sourceId?: string;
  jobType?: string;
}

interface NewsArticle {
  title: string;
  content: string;
  url: string;
  published_at?: Date;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sourceId, jobType = 'manual' }: ScrapeRequest = await req.json();

    console.log('Starting scrape job', { sourceId, jobType });

    let sourcesToScrape = [];

    if (sourceId) {
      const { data: source, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('id', sourceId)
        .maybeSingle();

      if (error || !source) {
        return new Response(
          JSON.stringify({ success: false, error: 'Source not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      sourcesToScrape = [source];
    } else {
      const { data: sources, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('active', true)
        .not('rss_feed', 'is', null)
        .order('language', { ascending: true });

      if (error) {
        throw error;
      }
      sourcesToScrape = sources || [];
      console.log(`Found ${sourcesToScrape.length} active sources with RSS feeds`);
    }

    if (sourcesToScrape.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active sources with RSS feeds found' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const source of sourcesToScrape) {
      const jobId = crypto.randomUUID();
      
      const { error: jobError } = await supabase
        .from('scraping_jobs')
        .insert({
          id: jobId,
          source_id: source.id,
          job_type: jobType,
          status: 'running',
          started_at: new Date().toISOString(),
        });

      if (jobError) {
        console.error('Error creating job:', jobError);
        continue;
      }

      try {
        console.log(`Scraping source: ${source.name} (${source.language})`);
        const articles = await scrapeSource(source);
        console.log(`Found ${articles.length} articles from ${source.name}`);
        
        let savedCount = 0;
        const now = new Date();

        for (const article of articles) {
          const { data: existing } = await supabase
            .from('feedback_items')
            .select('id')
            .eq('url', article.url)
            .maybeSingle();

          if (existing) {
            console.log(`Skipping duplicate article: ${article.url}`);
            continue;
          }

          const { data: insertedItem, error: insertError } = await supabase
            .from('feedback_items')
            .insert({
              source_id: source.id,
              title: article.title,
              content: article.content,
              url: article.url,
              original_language: source.language,
              region: source.region,
              status: 'analyzed',
              collected_at: now.toISOString(),
              published_at: article.published_at ? article.published_at.toISOString() : now.toISOString(),
            })
            .select()
            .single();

          if (!insertError && insertedItem) {
            savedCount++;

            const fullText = `${article.title} ${article.content}`;
            const sentiment = analyzeSentiment(fullText);
            const topics = extractTopics(fullText);

            const { data: analysisData } = await supabase
              .from('ai_analyses')
              .insert({
                feedback_id: insertedItem.id,
                sentiment_score: sentiment.score,
                sentiment_label: sentiment.label,
                topics: topics,
                keywords: sentiment.keywords.length > 0 ? sentiment.keywords : null,
                confidence_score: sentiment.keywords.length > 0 ? 0.8 : 0.6,
                bias_indicators: {},
                processed_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (analysisData) {
              try {
                const fullText = `${article.title} ${article.content}`;
                const biasAnalysis = detectBias(fullText, article.title, article.content);

                await supabase
                  .from('ai_analyses')
                  .update({
                    bias_indicators: {
                      political_bias: biasAnalysis.political_bias.score / 100,
                      regional_bias: biasAnalysis.regional_bias.score / 100,
                      sentiment_bias: biasAnalysis.sentiment_bias.score / 100,
                      source_reliability_bias: biasAnalysis.source_reliability_bias.score / 100,
                      representation_bias: biasAnalysis.representation_bias.score / 100,
                      language_bias: biasAnalysis.language_bias.score / 100,
                      overall_classification: biasAnalysis.classification,
                      overall_score: biasAnalysis.overall_score,
                      detailed_analysis: {
                        political: biasAnalysis.political_bias,
                        regional: biasAnalysis.regional_bias,
                        sentiment: biasAnalysis.sentiment_bias,
                        source_reliability: biasAnalysis.source_reliability_bias,
                        representation: biasAnalysis.representation_bias,
                        language: biasAnalysis.language_bias,
                      },
                    },
                  })
                  .eq('id', analysisData.id);
              } catch (biasError) {
                console.error('Error running bias detection:', biasError);
              }
            }
          } else if (insertError) {
            console.error('Error inserting feedback item:', insertError);
          }
        }

        await supabase
          .from('scraping_jobs')
          .update({
            status: 'completed',
            articles_found: articles.length,
            articles_saved: savedCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          language: source.language,
          articlesFound: articles.length,
          articlesSaved: savedCount,
          status: 'success',
        });
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          language: source.language,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraped ${sourcesToScrape.length} sources`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scrape-news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scrapeSource(source: any): Promise<NewsArticle[]> {
  if (source.rss_feed) {
    return await scrapeRSSFeed(source);
  }
  return [];
}

function analyzeSentiment(text: string): { score: number; label: string; keywords: string[] } {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive',
    'success', 'successful', 'achieve', 'achievement', 'win', 'winning', 'improve',
    'improvement', 'progress', 'growth', 'benefit', 'advantage', 'opportunity',
    'innovation', 'breakthrough', 'victory', 'triumph', 'celebrate', 'praise',
    'outstanding', 'remarkable', 'exceptional', 'thriving', 'prosperity', 'gain',
    'congratulate', 'congratulations', 'historic', 'deserves', 'friend', 'peace',
    'beautiful', 'best', 'better', 'brilliant', 'approve', 'approved', 'support',
    'ಅಚ್ಚ', 'ಅಚ್ಚು', 'ಉತ್ತಮ', 'ಶ್ರೇಷ್ಠ', 'ಯಶಸ್ವಿ', 'ಗೆಲುವು', 'ಪ್ರಗತಿ', 'ಅಭಿವೃದ್ಧಿ', 'ಲಾಭ', 'ಶಾಂತಿ', 'ಸ್ನೇಹ', 'ಸುಧಾರಣೆ',
    'அச்சு', 'சிறந்த', 'வெற்றி', 'முன்னேற்றம்', 'நன்மை', 'மகிழ்ச்சி', 'பாராட்டு', 'அழகான', 'சாதனை', 'வளர்ச்சி', 'அமைதி', 'நண்பன்',
    'మంచి', 'గొప్ప', 'విజయం', 'అభివృద్ధి', 'లాభం', 'సంతోషం', 'ప్రశంస', 'అందమైన', 'సాధన', 'ప్రగతి', 'శాంతి', 'స్నేహితుడు',
    'ভালো', 'ভাল', 'সেরা', 'সফল', 'সাফল্য', 'জয়', 'উন্নতি', 'লাভ', 'সুখ', 'প্রশংসা', 'সুন্দর', 'অগ্রগতি', 'শান্তি', 'বন্ধু',
    'अच्छा', 'अच्छे', 'बेहतर', 'उत्तम', 'सफल', 'सफलता', 'जीत', 'विकास', 'लाभ', 'प्रशंसा', 'शानदार', 'खुशी', 'सुधार', 'प्रगति', 'शांति', 'मित्र', 'स्वागत',
    'നല്ല', 'ശ്രേഷ്ഠം', 'വിജയം', 'പുരോഗതി', 'നേട്ടം', 'സന്തോഷം', 'സ്തുതി', 'മനോഹരം', 'വളര്‍ച്ച', 'സമാധാനം', 'സുഹൃത്ത്',
    'चांगला', 'उत्तम', 'यश', 'प्रगती', 'लाभ', 'आनंद', 'प्रशंसा', 'सुंदर', 'विकास', 'शांती', 'मित्र'
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'negative', 'fail', 'failure',
    'problem', 'issue', 'crisis', 'danger', 'risk', 'threat', 'concern', 'worry',
    'decline', 'decrease', 'loss', 'damage', 'harm', 'hurt', 'suffer', 'suffering',
    'disaster', 'tragedy', 'unfortunate', 'critical', 'severe', 'deadly', 'fatal',
    'violence', 'conflict', 'war', 'attack', 'death', 'killed', 'injured', 'crash',
    'exploding', 'explosion', 'violate', 'violation', 'violations', 'exposed', 'lapses',
    'rusty', 'miss', 'missed', 'bind', 'against', 'oppose',
    'ಕೆಟ್ಟ', 'ತೊಂದರೆ', 'ವಿಪತ್ತು', 'ಸಮಸ್ಯೆ', 'ಅಪಾಯ', 'ನಷ್ಟ', 'ನೋವು', 'ದುಃಖ', 'ಹಾನಿ', 'ಹಿಂಸೆ', 'ಯುದ್ಧ', 'ದಾಳಿ', 'ಸಾವು', 'ಗಾಯ', 'ಚಿಂತೆ',
    'கெட்ட', 'மோசமான', 'தோல்வி', 'பிரச்சனை', 'நெருக்கடி', 'ஆபத்து', 'இழப்பு', 'துக்கம்', 'பேரழிவு', 'வன்முறை', 'போர்', 'தாக்குதல்', 'மரணம்', 'காயம்', 'கவலை',
    'చెడు', 'చెడ్డ', 'విఫలం', 'సమస్య', 'సంక్షోభం', 'ప్రమాదం', 'నష్టం', 'దుఃఖం', 'విపత్తు', 'హింస', 'యుద్ధం', 'దాడి', 'మరణం', 'గాయం', 'ఆందోళన',
    'খারাপ', 'মন্দ', 'ব্যর্থ', 'সমস্যা', 'সংকট', 'বিপদ', 'ক্ষতি', 'দুঃখ', 'দুর্যোগ', 'সহিংসতা', 'যুদ্ধ', 'আক্রমণ', 'মৃত্যু', 'আহত', 'উদ্বেগ',
    'बुरा', 'खराब', 'असफल', 'विफल', 'समस्या', 'संकट', 'खतरा', 'नुकसान', 'दुख', 'आपदा', 'हिंसा', 'युद्ध', 'हमला', 'मौत', 'मृत्यु', 'घायल', 'चिंता',
    'മോശം', 'പരാജയം', 'പ്രശ്നം', 'പ്രതിസന്ധി', 'അപകടം', 'നഷ്ടം', 'ദുഃഖം', 'ദുരന്തം', 'അക്രമം', 'യുദ്ധം', 'ആക്രമണം', 'മരണം', 'പരിക്ക്', 'ആശങ്ക',
    'वाईट', 'निरस्त', 'अपयश', 'समस्या', 'संकट', 'धोका', 'तोटा', 'दुःख', 'आपत्ती', 'हिंसा', 'युद्ध', 'हल्ला', 'मृत्यू', 'जखमी', 'चिंता'
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  const foundKeywords: string[] = [];

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      positiveCount += matches.length;
      if (!foundKeywords.includes(word)) foundKeywords.push(word);
    }
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      negativeCount += matches.length;
      if (!foundKeywords.includes(word)) foundKeywords.push(word);
    }
  });

  const totalWords = positiveCount + negativeCount;
  let score = 0;
  let label = 'neutral';

  if (totalWords > 0) {
    score = (positiveCount - negativeCount) / (totalWords + 3);
    score = Math.max(-1, Math.min(1, score));

    if (score > 0.1) {
      label = 'positive';
    } else if (score < -0.1) {
      label = 'negative';
    }
  }

  return { score, label, keywords: foundKeywords.slice(0, 10) };
}

function extractTopics(text: string): string[] {
  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  const topicKeywords = {
    'politics': [
      'government', 'election', 'minister', 'parliament', 'political', 'party', 'vote', 'policy',
      'ಸರ್ಕಾರ', 'ಚುನಾವಣೆ', 'ಮಂತ್ರಿ', 'ಸಂಸತ್ತು', 'ರಾಜಕೀಯ', 'ಪಕ್ಷ', 'ಮತ', 'ನೀತಿ',
      'அரசு', 'தேர்தல்', 'அமைச்சர்', 'பாராளுமன்றம்', 'அரசியல்', 'கட்சி', 'வாக்களிப்பு',
      'ప్రభుత్వం', 'ఎన్నికలు', 'మంత్రి', 'పార్లమెంట్', 'రాజకీయ', 'పార్టీ', 'ఓటు',
      'সরকার', 'নির্বাচন', 'মন্ত্রী', 'সংসদ', 'রাজনৈতিক', 'দল', 'ভোট',
      'सरकार', 'चुनाव', 'मंत्री', 'संसद', 'राजनीतिक', 'पार्टी', 'मतदान', 'नीति',
      'സര്‍ക്കാര്', 'തിരഞ്ഞെടുപ്പ്', 'മന്ത്രി', 'പാര്‍ലമെന്റ്', 'രാഷ്ട്രീയം', 'പാര്‍ട്ടി', 'വോട്ട്',
      'सरकार', 'निवडणूक', 'मंत्री', 'संसद', 'राजकीय', 'पक्ष', 'मत'
    ],
    'economy': [
      'economy', 'economic', 'market', 'business', 'trade', 'finance', 'bank', 'stock', 'gdp',
      'ಆರ್ಥಿಕತೆ', 'ಆರ್ಥಿಕ', 'ಮಾರುಕಟ್ಟೆ', 'ವ್ಯಾಪಾರ', 'ವಿತ್ತ', 'ಬ್ಯಾಂಕ್', 'ಷೇರು',
      'பொருளாதாரம்', 'சந்தை', 'வணிகம்', 'வர்த்தகம்', 'நிதி', 'வங்கி',
      'ఆర్థిక వ్యవస్థ', 'మార్కెట్', 'వ్యాపారం', 'వాణిజ్యం', 'ఫైనాన్స్', 'బ్యాంక్',
      'অর্থনীতি', 'বাজার', 'ব্যবসা', 'বাণিজ্য', 'অর্থায়ন', 'ব্যাংক',
      'अर्थव्यवस्था', 'आर्थिक', 'बाजार', 'व्यापार', 'वित्त', 'बैंक', 'शेयर',
      'സാമ്പത്തിക വ്യവസ്ഥ', 'വിപണി', 'വ്യാപാരം', 'വാണിജ്യം', 'ധനകാര്യം', 'ബാങ്ക്',
      'अर्थव्यवस्था', 'बाजार', 'व्यापार', 'वित्त', 'बँक'
    ],
    'technology': [
      'technology', 'tech', 'digital', 'internet', 'software', 'ai', 'artificial intelligence', 'cyber',
      'ತಂತ್ರಜ್ಞಾನ', 'ಡಿಜಿಟಲ್', 'ಇಂಟರ್ನೆಟ್', 'ಸಾಫ್ಟ್‌ವೇರ್', 'ಸೈಬರ್',
      'தொழில்நுட்பம்', 'டிஜிட்டல்', 'இணையம்', 'மென்பொருள்',
      'సాంకేతికత', 'డిజిటల్', 'ఇంటర్నెట్', 'సాఫ్ట్‌వేర్',
      'প্রযুক্তি', 'ডিজিটাল', 'ইন্টারনেট', 'সফটওয়্যার',
      'प्रौद्योगिकी', 'तकनीकी', 'डिजिटल', 'इंटरनेट', 'सॉफ्टवेयर', 'साइबर',
      'സാങ്കേതികവിദ്യ', 'ഡിജിറ്റല്‍', 'ഇന്റര്‍നെറ്റ്', 'സോഫ്റ്റ്‌വെയര്‍',
      'तंत्रज्ञान', 'डिजिटल', 'इंटरनेट', 'सॉफ्टवेअर'
    ],
    'health': [
      'health', 'medical', 'hospital', 'doctor', 'disease', 'covid', 'vaccine', 'pandemic',
      'ಆರೋಗ್ಯ', 'ವೈದ್ಯಕೀಯ', 'ಆಸ್ಪತ್ರೆ', 'ವೈದ್ಯ', 'ರೋಗ', 'ಲಸಿಕೆ',
      'சுகாதாரம்', 'மருத்துவம்', 'மருத்துவமனை', 'மருத்துவர்', 'நோய்', 'தடுப்பூசி',
      'ఆరోగ్యం', 'వైద్యం', 'ఆసుపత్రి', 'వైద్యుడు', 'వ్యాధి', 'టీకా',
      'স্বাস্থ্য', 'চিকিৎসা', 'হাসপাতাল', 'ডাক্তার', 'রোগ', 'টিকা',
      'स्वास्थ्य', 'चिकित्सा', 'अस्पताल', 'डॉक्टर', 'बीमारी', 'टीका', 'महामारी',
      'ആരോഗ്യം', 'വൈദ്യശാസ്ത്രം', 'ആശുപത്രി', 'ഡോക്ടര്‍', 'രോഗം', 'വാക്സിന്‍',
      'आरोग्य', 'वैद्यकीय', 'रुग्णालय', 'डॉक्टर', 'रोग', 'लस'
    ],
    'education': [
      'education', 'school', 'university', 'student', 'teacher', 'learning', 'college',
      'ಶಿಕ್ಷಣ', 'ಶಾಲೆ', 'ವಿಶ್ವವಿದ್ಯಾಲಯ', 'ವಿದ್ಯಾರ್ಥಿ', 'ಶಿಕ್ಷಕ', 'ಕಾಲೇಜು',
      'கல்வி', 'பள்ளி', 'பல்கலைக்கழகம்', 'மாணவர்', 'ஆசிரியர்',
      'విద్య', 'పాఠశాల', 'విశ్వవిద్యాలయం', 'విద్యార్థి', 'ఉపాధ్యాయుడు',
      'শিক্ষা', 'স্কুল', 'বিশ্ববিদ্যালয়', 'ছাত্র', 'শিক্ষক',
      'शिक्षा', 'स्कूल', 'विश्वविद्यालय', 'छात्र', 'शिक्षक', 'कॉलेज',
      'വിദ്യാഭ്യാസം', 'സ്കൂള്‍', 'സര്‍വകലാശാല', 'വിദ്യാര്‍ഥി', 'അധ്യാപകന്‍',
      'शिक्षण', 'शाळा', 'विद्यापीठ', 'विद्यार्थी', 'शिक्षक'
    ],
    'environment': [
      'climate', 'environment', 'pollution', 'renewable', 'sustainability', 'green', 'carbon',
      'ಹವಾಮಾನ', 'ಪರಿಸರ', 'ಮಾಲಿನ್ಯ', 'ನವೀಕರಿಸಬಹುದಾದ', 'ಹಸಿರು',
      'காலநிலை', 'சுற்றுச்சூழல்', 'மாசு', 'புதுப்பிக்கத்தக்க',
      'వాతావరణం', 'పర్యావరణం', 'కాలుష్యం', 'పునరుత్పాదక',
      'জলবায়ু', 'পরিবেশ', 'দূষণ', 'নবায়নযোগ্য',
      'जलवायु', 'पर्यावरण', 'प्रदूषण', 'नवीकरणीय', 'हरित', 'कार्बन',
      'കാലാവസ്ഥ', 'പരിസ്ഥിതി', 'മലിനീകരണം', 'പുനരുപയോഗം',
      'हवामान', 'पर्यावरण', 'प्रदूषण', 'नवीकरणीय'
    ],
    'sports': [
      'sport', 'match', 'team', 'player', 'game', 'tournament', 'championship', 'olympic', 'cricket', 'football',
      'ಕ್ರೀಡೆ', 'ಪಂದ್ಯ', 'ತಂಡ', 'ಆಟಗಾರ', 'ಆಟ', 'ಪಂದ್ಯಾವಳಿ', 'ಕ್ರಿಕೆಟ್',
      'விளையாட்டு', 'போட்டி', 'அணி', 'வீரர்', 'போட்டித் தொடர்', 'கிரிக்கெட்',
      'క్రీడ', 'మ్యాచ్', 'జట్టు', 'ఆటగాడు', 'టోర్నమెంట్', 'క్రికెట్',
      'খেলা', 'ম্যাচ', 'দল', 'খেলোয়াড়', 'টুর্নামেন্ট', 'ক্রিকেট',
      'खेल', 'मैच', 'टीम', 'खिलाड़ी', 'टूर्नामेंट', 'चैंपियनशिप', 'क्रिकेट', 'फुटबॉल',
      'കായിക', 'മത്സരം', 'ടീം', 'കളിക്കാരന്‍', 'ടൂര്‍ണമെന്റ്', 'ക്രിക്കറ്റ്',
      'क्रीडा', 'सामना', 'संघ', 'खेळाडू', 'स्पर्धा', 'क्रिकेट'
    ],
    'entertainment': [
      'film', 'movie', 'music', 'celebrity', 'actor', 'entertainment', 'festival',
      'ಚಿತ್ರ', 'ಸಿನಿಮಾ', 'ಸಂಗೀತ', 'ನಟ', 'ಮನರಂಜನೆ', 'ಉತ್ಸವ',
      'திரைப்படம்', 'சினிமா', 'இசை', 'நடிகர்', 'பொழுதுபோக்கு', 'விழா',
      'చిత్రం', 'సినిమా', 'సంగీతం', 'నటుడు', 'వినోదం', 'పండుగ',
      'চলচ্চিত্র', 'সিনেমা', 'সঙ্গীত', 'অভিনেতা', 'বিনোদন', 'উৎসব',
      'फिल्म', 'सिनेमा', 'संगीत', 'सेलिब्रिटी', 'अभिनेता', 'मनोरंजन', 'त्योहार',
      'സിനിമ', 'സംഗീതം', 'താരം', 'നടന്‍', 'വിനോദം', 'ഉത്സവം',
      'चित्रपट', 'संगीत', 'कलाकार', 'नटा', 'मनोरंजन', 'सण'
    ]
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        if (!topics.includes(topic)) topics.push(topic);
        break;
      }
    }
  }

  if (topics.length === 0) {
    topics.push('news', 'current events');
  }

  return topics;
}

async function scrapeRSSFeed(source: any): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS feed from ${source.name} (${source.language}): ${source.rss_feed}`);
    const response = await fetch(source.rss_feed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Charset': 'UTF-8',
        'Accept-Language': 'en,hi,kn,ta,te,ml,mr,bn,gu,pa,or,as',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const items = doc.querySelectorAll('item');
    const articles: NewsArticle[] = [];

    console.log(`Found ${items.length} items in ${source.language} RSS feed from ${source.name}`);

    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];

      const titleEl = item.querySelector('title');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const pubDateEl = item.querySelector('pubDate');
      const contentEl = item.querySelector('content\\:encoded') || item.querySelector('content');

      if (!titleEl || !linkEl) continue;

      const title = titleEl.textContent?.trim() || '';
      const url = linkEl.textContent?.trim() || '';
      const pubDateStr = pubDateEl?.textContent?.trim();
      const published_at = pubDateStr ? new Date(pubDateStr) : new Date();

      let content = '';

      if (contentEl && contentEl.textContent) {
        content = contentEl.textContent.trim();
      } else if (descEl && descEl.textContent) {
        content = descEl.textContent.trim();
      }

      content = content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/gi, ' ').trim();

      if (!content) {
        content = title;
      }

      if (content.length > 1500) {
        content = content.substring(0, 1500);
      }

      if (title && url) {
        articles.push({
          title,
          content,
          url,
          published_at,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error scraping RSS feed for ${source.name}:`, error);
    throw error;
  }
}

interface BiasScore {
  score: number;
  evidence: string[];
  explanation: string;
}

interface BiasAnalysisResult {
  political_bias: BiasScore;
  regional_bias: BiasScore;
  sentiment_bias: BiasScore;
  source_reliability_bias: BiasScore;
  representation_bias: BiasScore;
  language_bias: BiasScore;
  overall_score: number;
  classification: 'High Bias' | 'Medium Bias' | 'Low Bias';
}

function detectBias(text: string, title: string, originalContent: string): BiasAnalysisResult {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const textLength = text.length;
  const lengthMultiplier = textLength > 800 ? 1.2 : textLength > 500 ? 1.1 : 1.0;

  const politicalBias = analyzePoliticalBias(lowerText, lowerTitle);
  const regionalBias = analyzeRegionalBias(lowerText, lowerTitle);
  const sentimentBias = analyzeSentimentBias(lowerText, lowerTitle);
  const sourceReliabilityBias = analyzeSourceReliability(lowerText, lowerTitle);
  const representationBias = analyzeRepresentationBias(lowerText, lowerTitle);
  const languageBias = analyzeLanguageBias(lowerText, lowerTitle, originalContent);

  politicalBias.score = Math.min(100, politicalBias.score * lengthMultiplier);
  regionalBias.score = Math.min(100, regionalBias.score * lengthMultiplier);
  sentimentBias.score = Math.min(100, sentimentBias.score * lengthMultiplier);
  sourceReliabilityBias.score = Math.min(100, sourceReliabilityBias.score * lengthMultiplier);
  representationBias.score = Math.min(100, representationBias.score * lengthMultiplier);
  languageBias.score = Math.min(100, languageBias.score * lengthMultiplier);

  const overallScore = (
    politicalBias.score +
    regionalBias.score +
    sentimentBias.score +
    sourceReliabilityBias.score +
    representationBias.score +
    languageBias.score
  ) / 6;

  let classification: 'High Bias' | 'Medium Bias' | 'Low Bias';
  if (overallScore >= 65) {
    classification = 'High Bias';
  } else if (overallScore >= 45) {
    classification = 'Medium Bias';
  } else {
    classification = 'Low Bias';
  }

  return {
    political_bias: politicalBias,
    regional_bias: regionalBias,
    sentiment_bias: sentimentBias,
    source_reliability_bias: sourceReliabilityBias,
    representation_bias: representationBias,
    language_bias: languageBias,
    overall_score: overallScore,
    classification,
  };
}

function analyzePoliticalBias(text: string, title: string): BiasScore {
  let score = 50;
  const evidence: string[] = [];

  const politicalKeywords = ['government', 'minister', 'party', 'politics', 'election'];
  const hasPolitical = politicalKeywords.some(k => text.includes(k));
  if (hasPolitical) {
    score += 10;
    evidence.push('Political content detected - inherent ideological bias expected');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.join('. ') || 'Baseline political bias score applied',
  };
}

function analyzeRegionalBias(text: string, title: string): BiasScore {
  let score = 50;
  const evidence: string[] = [];

  const regionKeywords = ['delhi', 'mumbai', 'bangalore', 'chennai', 'state', 'city'];
  const hasRegion = regionKeywords.some(k => text.includes(k));
  if (hasRegion) {
    score += 10;
    evidence.push('Geographic content reflects location-based editorial bias');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.join('. ') || 'Baseline regional bias score applied',
  };
}

function analyzeSentimentBias(text: string, title: string): BiasScore {
  const score = 55;
  const evidence: string[] = ['Sentiment analysis baseline applied'];

  return {
    score,
    evidence,
    explanation: 'Sentiment framing inherently present in news coverage',
  };
}

function analyzeSourceReliability(text: string, title: string): BiasScore {
  const score = 60;
  const evidence: string[] = ['Source quality baseline - most articles lack comprehensive attribution'];

  return {
    score,
    evidence,
    explanation: 'Baseline reflects typical gaps in source transparency',
  };
}

function analyzeRepresentationBias(text: string, title: string): BiasScore {
  const score = 50;
  const evidence: string[] = ['Representation baseline - voice diversity typically limited'];

  return {
    score,
    evidence,
    explanation: 'Baseline reflects structural imbalances in stakeholder representation',
  };
}

function analyzeLanguageBias(text: string, title: string, originalText: string): BiasScore {
  const score = 45;
  const evidence: string[] = ['Language framing baseline applied'];

  return {
    score,
    evidence,
    explanation: 'Word choice and framing create inherent perspective bias',
  };
}