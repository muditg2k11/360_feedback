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

    console.log('Generating summary for:', title.substring(0, 50));

    // Generate unique summary from actual content
    const summary = generateContentBasedSummary(content, title, language);

    console.log('Generated summary:', summary);

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

function generateContentBasedSummary(content: string, title: string, language: string): string {
  // Clean the content
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  
  if (!cleanContent || cleanContent.length < 20) {
    return cleanTitle.substring(0, 150);
  }

  // Split into sentences (handle multiple scripts)
  const sentenceDelimiters = /[.!?।॥\u0964\u0965]+\s+/;
  const sentences = cleanContent.split(sentenceDelimiters)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out very short fragments

  if (sentences.length === 0) {
    // If no proper sentences, take first 150 chars
    return cleanContent.substring(0, 150) + (cleanContent.length > 150 ? '...' : '');
  }

  // Score sentences based on importance
  const scoredSentences = sentences.map(sentence => ({
    text: sentence,
    score: calculateSentenceScore(sentence, cleanTitle, cleanContent)
  }));

  // Sort by score descending
  scoredSentences.sort((a, b) => b.score - a.score);

  // Take the most important sentence(s)
  let summary = '';
  
  // Try to get a good summary length (100-150 chars)
  for (const scored of scoredSentences) {
    const potentialSummary = summary ? summary + ' ' + scored.text : scored.text;
    
    if (potentialSummary.length <= 150) {
      summary = potentialSummary;
    } else if (!summary) {
      // If even the first sentence is too long, truncate it
      summary = scored.text.substring(0, 147) + '...';
      break;
    } else {
      // We have enough content
      break;
    }
  }

  // If summary is still empty, use first sentence
  if (!summary && sentences.length > 0) {
    summary = sentences[0].substring(0, 150);
    if (sentences[0].length > 150) summary += '...';
  }

  return summary || cleanContent.substring(0, 150) + '...';
}

function calculateSentenceScore(sentence: string, title: string, fullContent: string): number {
  let score = 0;
  const sentenceLower = sentence.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Position bonus - earlier sentences are usually more important
  const position = fullContent.toLowerCase().indexOf(sentenceLower);
  const positionScore = 1 - (position / fullContent.length);
  score += positionScore * 10;

  // Length penalty/bonus - prefer medium length sentences
  const words = sentence.split(/\s+/).length;
  if (words >= 8 && words <= 25) {
    score += 15;
  } else if (words < 5 || words > 35) {
    score -= 10;
  }

  // Title word overlap - sentences with words from title are important
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
  let titleOverlap = 0;
  for (const word of titleWords) {
    if (sentenceLower.includes(word)) {
      titleOverlap++;
    }
  }
  score += titleOverlap * 5;

  // Important keywords across all languages
  const importantKeywords = [
    // English
    'announce', 'launch', 'new', 'plan', 'scheme', 'project', 'government', 
    'minister', 'chief', 'president', 'will', 'today', 'year', 'crore', 'lakh',
    'development', 'initiative', 'programme', 'policy',
    
    // Hindi
    'घोषणा', 'नया', 'योजना', 'सरकार', 'मंत्री', 'विकास', 'करोड़',
    
    // Kannada
    'ಘೋಷಣೆ', 'ಹೊಸ', 'ಯೋಜನೆ', 'ಸರ್ಕಾರ', 'ಮಂತ್ರಿ', 'ಅಭಿವೃದ್ಧಿ',
    
    // Tamil
    'அறிவிப்பு', 'புதிய', 'திட்டம்', 'அரசு', 'அமைச்சர்', 'வளர்ச்சி',
    
    // Telugu
    'ప్రకటన', 'కొత్త', 'పథకం', 'ప్రభుత్వం', 'మంత్రి', 'అభివృద్ధి',
    
    // Malayalam
    'പ്രഖ്യാപനം', 'പുതിയ', 'പദ്ധതി', 'സർക്കാർ', 'മന്ത്രി', 'വികസനം',
    
    // Bengali
    'ঘোষণা', 'নতুন', 'প্রকল্প', 'সরকার', 'মন্ত্রী', 'উন্নয়ন',
    
    // Marathi
    'जाहीर', 'नवीन', 'योजना', 'सरकार', 'मंत्री', 'विकास'
  ];

  let keywordCount = 0;
  for (const keyword of importantKeywords) {
    if (sentenceLower.includes(keyword.toLowerCase())) {
      keywordCount++;
    }
  }
  score += keywordCount * 3;

  // Numbers and dates add specificity
  if (/\d+/.test(sentence)) {
    score += 5;
  }

  // Question sentences are usually not good summaries
  if (sentence.includes('?')) {
    score -= 20;
  }

  return score;
}
