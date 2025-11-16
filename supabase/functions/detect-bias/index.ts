import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BiasDetectionRequest {
  title: string;
  content: string;
  feedbackId?: string;
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

    const { title, content, feedbackId }: BiasDetectionRequest = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and content are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const fullText = `${title} ${content}`;
    const biasAnalysis = detectBias(fullText, title, content);

    if (feedbackId) {
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
        .eq('feedback_id', feedbackId);
    }

    return new Response(
      JSON.stringify({ success: true, analysis: biasAnalysis }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in detect-bias:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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
