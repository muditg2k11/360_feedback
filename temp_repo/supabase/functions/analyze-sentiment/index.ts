import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AnalysisRequest {
  feedbackId: string;
  content: string;
  language: string;
}

interface SentimentAnalysis {
  sentiment_score: number;
  sentiment_label: string;
  confidence_score: number;
  topics: string[];
  keywords: string[];
  entities: Array<{ text: string; type: string }>;
  bias_indicators: {
    political_bias: number;
    regional_bias: number;
    source_bias: number;
  };
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

    const { feedbackId, content, language }: AnalysisRequest = await req.json();

    if (!feedbackId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const analysis = await performSentimentAnalysis(content, language);

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        feedback_id: feedbackId,
        sentiment_score: analysis.sentiment_score,
        sentiment_label: analysis.sentiment_label,
        topics: analysis.topics,
        entities: analysis.entities,
        keywords: analysis.keywords,
        language_detected: language,
        confidence_score: analysis.confidence_score,
        bias_indicators: analysis.bias_indicators,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting analysis:', insertError);
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from('feedback_items')
      .update({ status: 'analyzed' })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback status:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, analysis: insertedAnalysis }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-sentiment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performSentimentAnalysis(
  content: string,
  language: string
): Promise<SentimentAnalysis> {
  const words = content.toLowerCase().split(/\s+/);
  
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'achievement', 'progress', 'improvement', 'beneficial', 'effective'];
  const negativeWords = ['bad', 'poor', 'negative', 'failure', 'problem', 'issue', 'crisis', 'concern', 'decline', 'ineffective'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  const totalSentimentWords = positiveCount + negativeCount;
  let sentimentScore = 0;
  let sentimentLabel = 'neutral';
  
  if (totalSentimentWords > 0) {
    sentimentScore = (positiveCount - negativeCount) / Math.max(totalSentimentWords, words.length / 10);
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
    
    if (sentimentScore > 0.2) sentimentLabel = 'positive';
    else if (sentimentScore < -0.2) sentimentLabel = 'negative';
    else if (Math.abs(positiveCount - negativeCount) < 2 && totalSentimentWords > 3) sentimentLabel = 'mixed';
  }
  
  const topics = extractTopics(content);
  const keywords = extractKeywords(words);
  const entities = extractEntities(content);
  
  const biasIndicators = calculateBiasIndicators(content, language);
  
  return {
    sentiment_score: sentimentScore,
    sentiment_label: sentimentLabel,
    confidence_score: Math.min(0.95, 0.6 + (totalSentimentWords / words.length) * 2),
    topics,
    keywords,
    entities,
    bias_indicators: biasIndicators,
  };
}

function extractTopics(content: string): string[] {
  const topicKeywords = {
    'Government Policy': ['policy', 'government', 'minister', 'parliament', 'legislation'],
    'Infrastructure': ['infrastructure', 'road', 'bridge', 'construction', 'development'],
    'Healthcare': ['health', 'hospital', 'medical', 'doctor', 'patient', 'vaccine'],
    'Education': ['education', 'school', 'university', 'student', 'teacher'],
    'Economy': ['economy', 'business', 'trade', 'market', 'finance', 'growth'],
    'Technology': ['technology', 'digital', 'internet', 'innovation', 'startup'],
    'Agriculture': ['agriculture', 'farmer', 'crop', 'harvest', 'farming'],
    'Environment': ['environment', 'climate', 'pollution', 'green', 'sustainable'],
  };
  
  const contentLower = content.toLowerCase();
  const topics: string[] = [];
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics.length > 0 ? topics : ['General'];
}

function extractKeywords(words: string[]): string[] {
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it']);
  
  const wordFreq: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function extractEntities(content: string): Array<{ text: string; type: string }> {
  const entities: Array<{ text: string; type: string }> = [];
  
  const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  const locationKeywords = ['State', 'District', 'City', 'Village', 'Region', 'Pradesh', 'India'];
  const orgKeywords = ['Ministry', 'Department', 'Corporation', 'Board', 'Commission', 'Authority'];
  
  capitalizedWords.forEach(word => {
    if (locationKeywords.some(k => word.includes(k))) {
      entities.push({ text: word, type: 'LOCATION' });
    } else if (orgKeywords.some(k => word.includes(k))) {
      entities.push({ text: word, type: 'ORGANIZATION' });
    } else if (word.length > 2) {
      entities.push({ text: word, type: 'PERSON' });
    }
  });
  
  return entities.slice(0, 10);
}

function calculateBiasIndicators(content: string, language: string): {
  political_bias: number;
  regional_bias: number;
  source_bias: number;
} {
  const contentLower = content.toLowerCase();
  
  const politicalWords = ['party', 'opposition', 'ruling', 'coalition', 'election', 'campaign'];
  const politicalScore = politicalWords.filter(w => contentLower.includes(w)).length / 10;
  
  const regionalWords = ['state', 'regional', 'local', 'district', 'community'];
  const regionalScore = regionalWords.filter(w => contentLower.includes(w)).length / 10;
  
  const opinionatedWords = ['should', 'must', 'believe', 'claim', 'alleged', 'reportedly'];
  const sourceScore = opinionatedWords.filter(w => contentLower.includes(w)).length / 10;
  
  return {
    political_bias: Math.min(1, politicalScore),
    regional_bias: Math.min(1, regionalScore),
    source_bias: Math.min(1, sourceScore),
  };
}
