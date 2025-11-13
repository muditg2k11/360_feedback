import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SummaryRequest {
  feedbackId?: string;
  content: string;
  title: string;
  language: string;
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

    const { feedbackId, content, title, language }: SummaryRequest = await req.json();

    if (!content || !title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content and title are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate intelligent summary based on content analysis
    const summary = generateIntelligentSummary(content, title, language);

    // If feedbackId provided, update the database
    if (feedbackId) {
      const { error: updateError } = await supabase
        .from('feedback_items')
        .update({ summary })
        .eq('id', feedbackId);

      if (updateError) {
        console.error('Error updating summary:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating summary:', error);
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

function generateIntelligentSummary(content: string, title: string, language: string): string {
  // Clean and normalize content
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  
  // Extract key information from content
  const sentences = cleanContent.match(/[^.!?।]+[.!?।]+/g) || [cleanContent];
  
  // Identify key themes and entities
  const keywords = extractKeywords(cleanContent, language);
  const mainTopic = identifyMainTopic(cleanTitle, cleanContent, keywords);
  const action = identifyAction(cleanContent, language);
  const location = extractLocation(cleanContent, language);
  
  // Build intelligent summary
  let summary = '';
  
  if (action && location) {
    summary = `${location} ${action} related to ${mainTopic}.`;
  } else if (action) {
    summary = `${action} concerning ${mainTopic} in the region.`;
  } else if (mainTopic) {
    summary = `News coverage on ${mainTopic} and its impact on local communities.`;
  } else {
    // Fallback: Use first sentence or first 100 chars
    if (sentences.length > 0) {
      summary = sentences[0].trim().substring(0, 120);
      if (summary.length === 120) summary += '...';
    } else {
      summary = cleanContent.substring(0, 100) + '...';
    }
  }
  
  return summary;
}

function extractKeywords(content: string, language: string): string[] {
  const keywords: string[] = [];
  
  // English keywords
  const englishTerms = [
    'government', 'minister', 'development', 'project', 'scheme', 'policy',
    'infrastructure', 'metro', 'railway', 'road', 'education', 'school',
    'farmer', 'agriculture', 'crop', 'healthcare', 'hospital', 'election',
    'budget', 'economy', 'technology', 'digital', 'welfare', 'employment'
  ];
  
  // Regional language keywords
  const regionalTerms: { [key: string]: string[] } = {
    'Kannada': ['ಸರ್ಕಾರ', 'ಅಭಿವೃದ್ಧಿ', 'ಯೋಜನೆ', 'ಮೆಟ್ರೋ', 'ರೈತ', 'ಶಿಕ್ಷಣ'],
    'Tamil': ['அரசு', 'வளர்ச்சி', 'திட்டம்', 'மெட்ரோ', 'விவசாயி', 'கல்வி'],
    'Telugu': ['ప్రభుత్వం', 'అభివృద్ధి', 'ప్రాజెక్ట్', 'మెట్రో', 'రైతు', 'విద్య'],
    'Malayalam': ['സർക്കാർ', 'വികസനം', 'പദ്ധതി', 'മെട്രോ', 'കർഷക', 'വിദ്യാഭ്യാസം'],
    'Hindi': ['सरकार', 'विकास', 'योजना', 'मेट्रो', 'किसान', 'शिक्षा'],
    'Bengali': ['সরকার', 'উন্নয়ন', 'প্রকল্প', 'মেট্রো', 'কৃষক', 'শিক্ষা'],
    'Marathi': ['सरकार', 'विकास', 'योजना', 'मेट्रो', 'शेतकरी', 'शिक्षण']
  };
  
  const termsToCheck = [...englishTerms, ...(regionalTerms[language] || [])];
  
  for (const term of termsToCheck) {
    if (content.includes(term)) {
      keywords.push(term);
    }
  }
  
  return keywords;
}

function identifyMainTopic(title: string, content: string, keywords: string[]): string {
  const combined = (title + ' ' + content).toLowerCase();
  
  // Topic categories with their indicators
  const topics: { [key: string]: string[] } = {
    'metro and urban transport': ['metro', 'মেট্রো', 'मेट्रो', 'ಮೆಟ್ರೋ', 'మెట్రో', 'மெட்ரோ', 'മെട്രോ', 'transport', 'railway'],
    'agriculture and farmer welfare': ['farmer', 'agriculture', 'crop', 'किसान', 'রৈতু', 'ರೈತ', 'రైతు', 'விவசாயி', 'കർഷക', 'शेतकरी'],
    'education and digital learning': ['education', 'school', 'digital', 'शिक्षा', 'শিক্ষা', 'ಶಿಕ್ಷಣ', 'విద్య', 'கல்வி', 'വിദ്യാഭ്യാസം', 'शिक्षण'],
    'infrastructure development': ['infrastructure', 'development', 'project', 'construction', 'road', 'bridge'],
    'healthcare initiatives': ['health', 'hospital', 'medical', 'healthcare', 'doctor', 'treatment'],
    'economic policy': ['economy', 'budget', 'finance', 'economic', 'investment', 'gdp'],
    'government schemes': ['scheme', 'policy', 'program', 'initiative', 'योजना', 'প্রকল্প', 'ಯೋಜನೆ', 'పథకం', 'திட்டம்', 'പദ്ധതി']
  };
  
  for (const [topic, indicators] of Object.entries(topics)) {
    for (const indicator of indicators) {
      if (combined.includes(indicator.toLowerCase())) {
        return topic;
      }
    }
  }
  
  return 'regional developments';
}

function identifyAction(content: string, language: string): string {
  const combined = content.toLowerCase();
  
  const actions: { [key: string]: string[] } = {
    'Government announces': ['announce', 'घोषणा', 'ঘোষণা', 'ಪ್ರಕಟ', 'ప్రకటన', 'அறிவிப்பு', 'പ്രഖ്യാപനം', 'जाहीर'],
    'New initiative launched': ['launch', 'start', 'begin', 'inaugurate', 'प्रारंभ', 'শুরু', 'ಪ್ರಾರಂಭ', 'ప్రారంభం', 'தொடக்கம்', 'ആരംഭം'],
    'Development project approved': ['approve', 'sanction', 'clear', 'स्वीकृत', 'অনুমোদন', 'ಅನುಮೋದನೆ', 'ఆమోదం', 'ஒப்புதல்', 'അംഗീകാരം'],
    'Expansion planned': ['expand', 'extend', 'scale', 'विस्तार', 'সম্প্রসারণ', 'ವಿಸ್ತರಣೆ', 'విస్తరణ', 'விரிவாக்கம்', 'വിപുലീകരണം'],
    'Initiative underway': ['underway', 'ongoing', 'progress', 'continue', 'implement']
  };
  
  for (const [action, indicators] of Object.entries(actions)) {
    for (const indicator of indicators) {
      if (combined.includes(indicator.toLowerCase())) {
        return action;
      }
    }
  }
  
  return '';
}

function extractLocation(content: string, language: string): string {
  const locations = [
    'Karnataka', 'Bangalore', 'Bengaluru', 'ಕರ್ನಾಟಕ', 'ಬೆಂಗಳೂರು',
    'Tamil Nadu', 'Chennai', 'தமிழகம்', 'சென்னை',
    'Telangana', 'Hyderabad', 'తెలంగాణ', 'హైదరాబాద్',
    'Kerala', 'Thiruvananthapuram', 'കേരളം', 'തിരുവനന്തപുരം',
    'Delhi', 'दिल्ली', 'UP', 'Uttar Pradesh', 'उत्तर प्रदेश',
    'West Bengal', 'Kolkata', 'পশ্চিমবঙ্গ', 'কলকাতা',
    'Maharashtra', 'Mumbai', 'महाराष्ट्र', 'मुंबई'
  ];
  
  for (const location of locations) {
    if (content.includes(location)) {
      return location;
    }
  }
  
  return '';
}
