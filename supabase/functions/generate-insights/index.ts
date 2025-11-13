import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InsightsRequest {
  limit?: number;
  region?: string;
  language?: string;
  category?: string;
}

interface InsightResult {
  headline: string;
  bulletPoints: string[];
  articlesAnalyzed: number;
  topTopics: string[];
  sentiment: string;
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

    const { limit = 50, region, language, category }: InsightsRequest = await req.json();

    console.log('Generating insights with filters:', { limit, region, language, category });

    // Build query with filters
    let query = supabase
      .from('feedback_items')
      .select('title, content, summary, region, original_language, category, published_at, collected_at')
      .order('collected_at', { ascending: false })
      .limit(limit);

    if (region) {
      query = query.eq('region', region);
    }
    if (language) {
      query = query.eq('original_language', language);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No articles found with the specified filters' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Analyzing ${articles.length} articles...`);

    // Generate insights from articles
    const insights = generateInsightsFromArticles(articles);

    return new Response(
      JSON.stringify({ success: true, insights }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateInsightsFromArticles(articles: any[]): InsightResult {
  // Extract all text for analysis
  const allContent = articles.map(a => `${a.title} ${a.summary || a.content}`).join(' ');
  
  // Identify key topics and themes
  const topics = extractTopics(articles);
  const regionalDistribution = getRegionalDistribution(articles);
  const languageDistribution = getLanguageDistribution(articles);
  const keyEntities = extractKeyEntities(allContent);
  const topCategories = getCategoryDistribution(articles);
  
  // Generate headline based on most prominent theme
  const headline = generateHeadline(topics, regionalDistribution, articles.length);
  
  // Generate 3-5 bullet points
  const bulletPoints = generateBulletPoints(
    articles,
    topics,
    regionalDistribution,
    languageDistribution,
    keyEntities,
    topCategories
  );
  
  // Determine overall sentiment
  const sentiment = analyzeSentiment(allContent);
  
  return {
    headline,
    bulletPoints,
    articlesAnalyzed: articles.length,
    topTopics: topics.slice(0, 5),
    sentiment
  };
}

function extractTopics(articles: any[]): string[] {
  const topicCount: { [key: string]: number } = {};
  
  const topicKeywords: { [key: string]: string[] } = {
    'Metro & Transport': ['metro', 'মেট্রো', 'मेट्रो', 'ಮೆಟ್ರೋ', 'మెట్రో', 'மெட்ரோ', 'മെട്രോ', 'transport', 'railway', 'bus', 'road'],
    'Agriculture': ['farmer', 'agriculture', 'crop', 'किसान', 'রৈতু', 'ರೈತ', 'రైతు', 'விவசாயி', 'കർഷക', 'शेतकरी', 'खेती', 'কৃষি'],
    'Education': ['education', 'school', 'student', 'university', 'शिक्षा', 'শিক্ষা', 'ಶಿಕ್ಷಣ', 'విద్య', 'கல்வி', 'വിദ്യാഭ്യാസം', 'शिक्षण'],
    'Healthcare': ['health', 'hospital', 'medical', 'doctor', 'स्वास्थ्य', 'স্বাস্থ্য', 'ಆರೋಗ್ಯ', 'ఆరోగ్యం', 'சுகாதாரம்', 'ആരോഗ്യം'],
    'Infrastructure': ['infrastructure', 'development', 'project', 'construction', 'road', 'bridge', 'building'],
    'Government Schemes': ['scheme', 'योजना', 'প্রকল্প', 'ಯೋಜನೆ', 'పథకం', 'திட்டம்', 'പദ്ധതി', 'policy', 'welfare'],
    'Economy': ['economy', 'budget', 'finance', 'investment', 'economic', 'gdp', 'crore', 'lakh'],
    'Technology': ['digital', 'technology', 'online', 'internet', 'app', 'software', 'tech'],
    'Environment': ['environment', 'pollution', 'climate', 'green', 'clean', 'eco'],
    'Employment': ['job', 'employment', 'unemployment', 'work', 'career', 'रोजगार', 'வேலை', 'ఉద్యోగం']
  };
  
  for (const article of articles) {
    const text = `${article.title} ${article.content} ${article.summary || ''}`.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
          break;
        }
      }
    }
  }
  
  return Object.entries(topicCount)
    .sort(([, a], [, b]) => b - a)
    .map(([topic]) => topic);
}

function getRegionalDistribution(articles: any[]): { [key: string]: number } {
  const distribution: { [key: string]: number } = {};
  
  for (const article of articles) {
    const region = article.region || 'Unknown';
    distribution[region] = (distribution[region] || 0) + 1;
  }
  
  return distribution;
}

function getLanguageDistribution(articles: any[]): { [key: string]: number } {
  const distribution: { [key: string]: number } = {};
  
  for (const article of articles) {
    const language = article.original_language || 'Unknown';
    distribution[language] = (distribution[language] || 0) + 1;
  }
  
  return distribution;
}

function getCategoryDistribution(articles: any[]): { [key: string]: number } {
  const distribution: { [key: string]: number } = {};
  
  for (const article of articles) {
    const category = article.category || 'Uncategorized';
    distribution[category] = (distribution[category] || 0) + 1;
  }
  
  return distribution;
}

function extractKeyEntities(content: string): string[] {
  const entities: string[] = [];
  const entityPatterns = [
    // Government officials
    /(?:minister|chief minister|prime minister|president|governor|cm|pm)\s+\w+/gi,
    // Locations
    /(?:karnataka|tamil nadu|telangana|kerala|delhi|mumbai|bangalore|chennai|hyderabad)/gi,
    // Numbers with crore/lakh
    /\d+\s*(?:crore|lakh|billion|million)/gi,
    // Dates
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
  ];
  
  for (const pattern of entityPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      entities.push(...matches);
    }
  }
  
  return [...new Set(entities)].slice(0, 10);
}

function generateHeadline(topics: string[], regionalDist: { [key: string]: number }, totalArticles: number): string {
  const topTopic = topics[0] || 'Regional Developments';
  const topRegions = Object.entries(regionalDist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([region]) => region);
  
  const headlines = [
    `${topTopic} Dominates News Across ${topRegions.join(' and ')} With ${totalArticles} Reports`,
    `Latest Updates: ${topTopic} Takes Center Stage in ${topRegions[0]} Region`,
    `Breaking: ${totalArticles} New Developments in ${topTopic} Reported Across India`,
    `${topTopic} Developments Lead Regional News Coverage in ${topRegions.join(', ')}`,
    `Major Focus on ${topTopic}: Analysis of ${totalArticles} Recent Reports`
  ];
  
  return headlines[Math.floor(Math.random() * headlines.length)];
}

function generateBulletPoints(
  articles: any[],
  topics: string[],
  regionalDist: { [key: string]: number },
  languageDist: { [key: string]: number },
  entities: string[],
  categories: { [key: string]: number }
): string[] {
  const bullets: string[] = [];
  
  // Bullet 1: Volume and coverage
  const topRegions = Object.entries(regionalDist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  bullets.push(
    `Analyzed ${articles.length} articles covering ${Object.keys(regionalDist).length} regions, ` +
    `with highest coverage in ${topRegions.map(([r, c]) => `${r} (${c})`).join(', ')}`
  );
  
  // Bullet 2: Top topics
  if (topics.length > 0) {
    const topTopics = topics.slice(0, 3).join(', ');
    bullets.push(
      `Primary focus areas: ${topTopics}, reflecting major policy initiatives and public interest`
    );
  }
  
  // Bullet 3: Language and reach
  const topLanguages = Object.entries(languageDist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  bullets.push(
    `Multi-lingual coverage across ${Object.keys(languageDist).length} languages: ` +
    `${topLanguages.map(([l, c]) => `${l} (${c})`).join(', ')}, ensuring diverse regional representation`
  );
  
  // Bullet 4: Key themes from summaries
  const commonThemes = findCommonThemes(articles);
  if (commonThemes.length > 0) {
    bullets.push(
      `Recurring themes include: ${commonThemes.slice(0, 3).join(', ')}, indicating coordinated policy initiatives`
    );
  }
  
  // Bullet 5: Recent activity
  const recentArticles = articles.filter(a => {
    const date = new Date(a.collected_at || a.published_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return date >= oneDayAgo;
  });
  
  if (recentArticles.length > 0) {
    bullets.push(
      `${recentArticles.length} articles published in the last 24 hours, showing active media engagement and real-time coverage`
    );
  } else {
    // Alternative: Category distribution
    const topCategories = Object.entries(categories)
      .filter(([cat]) => cat !== 'Uncategorized')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    if (topCategories.length > 0) {
      bullets.push(
        `Category breakdown: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}, ` +
        `highlighting priority sectors for government communication`
      );
    }
  }
  
  return bullets.slice(0, 5);
}

function findCommonThemes(articles: any[]): string[] {
  const themeKeywords = [
    'announcement', 'launch', 'inauguration', 'expansion', 'development',
    'welfare', 'scheme', 'initiative', 'project', 'improvement',
    'modernization', 'upgrade', 'investment', 'funding', 'budget'
  ];
  
  const themeCount: { [key: string]: number } = {};
  
  for (const article of articles) {
    const text = `${article.summary || article.content}`.toLowerCase();
    for (const keyword of themeKeywords) {
      if (text.includes(keyword)) {
        themeCount[keyword] = (themeCount[keyword] || 0) + 1;
      }
    }
  }
  
  return Object.entries(themeCount)
    .sort(([, a], [, b]) => b - a)
    .map(([theme]) => theme)
    .slice(0, 5);
}

function analyzeSentiment(content: string): string {
  const positiveWords = [
    'improve', 'better', 'success', 'growth', 'development', 'progress',
    'benefit', 'welfare', 'advance', 'enhance', 'upgrade', 'modernize'
  ];
  
  const negativeWords = [
    'crisis', 'problem', 'issue', 'delay', 'failure', 'concern',
    'challenge', 'difficulty', 'shortage', 'decline'
  ];
  
  const lowerContent = content.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    positiveCount += (lowerContent.match(new RegExp(word, 'g')) || []).length;
  }
  
  for (const word of negativeWords) {
    negativeCount += (lowerContent.match(new RegExp(word, 'g')) || []).length;
  }
  
  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
  return 'neutral';
}
