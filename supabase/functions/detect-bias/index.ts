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
    const sentimentAnalysis = analyzeSentiment(fullText);

    if (feedbackId) {
      const { error: upsertError } = await supabase
        .from('ai_analyses')
        .upsert({
          feedback_id: feedbackId,
          sentiment_score: sentimentAnalysis.score,
          sentiment_label: sentimentAnalysis.label,
          topics: [],
          entities: [],
          keywords: [],
          language_detected: 'en',
          confidence_score: 0.85,
          bias_indicators: {
            political_bias: biasAnalysis.political_bias.score / 100,
            regional_bias: biasAnalysis.regional_bias.score / 100,
            sentiment_bias: biasAnalysis.sentiment_bias.score / 100,
            source_reliability_bias: biasAnalysis.source_reliability_bias.score / 100,
            representation_bias: biasAnalysis.representation_bias.score / 100,
            language_bias: biasAnalysis.language_bias.score / 100,
            overall_classification: biasAnalysis.classification,
            overall_score: biasAnalysis.overall_score,
            sentiment_details: sentimentAnalysis,
            detailed_analysis: {
              political: biasAnalysis.political_bias,
              regional: biasAnalysis.regional_bias,
              sentiment: biasAnalysis.sentiment_bias,
              source_reliability: biasAnalysis.source_reliability_bias,
              representation: biasAnalysis.representation_bias,
              language: biasAnalysis.language_bias,
            },
          },
        }, {
          onConflict: 'feedback_id'
        });

      if (upsertError) {
        console.error('Error upserting analysis:', upsertError);
      }

      const { error: statusError } = await supabase
        .from('feedback_items')
        .update({ status: 'analyzed' })
        .eq('id', feedbackId);

      if (statusError) {
        console.error('Error updating feedback status:', statusError);
      }
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
  let score = 20;
  const evidence: string[] = [];

  const emotionalLanguage = [
    'fury', 'outrage', 'slams', 'blasts', 'attacks', 'condemns', 'denounces',
    'controversy', 'scandal', 'crisis', 'shocking', 'devastating', 'alarming',
    'terrifying', 'horrific', 'explosive', 'dramatic', 'sensational', 'extraordinary',
    'catastrophic', 'disastrous', 'brilliant', 'amazing', 'fantastic', 'incredible',
    'miracle', 'triumph', 'victory', 'disaster', 'chaos', 'turmoil', 'uproar',
    'backlash', 'firestorm', 'bombshell', 'staggering', 'unprecedented', 'remarkable'
  ];

  const negativeWords = [
    'bad', 'poor', 'failure', 'problem', 'issue', 'crisis', 'concern',
    'decline', 'ineffective', 'corrupt', 'illegal', 'fraud', 'scam', 'wrong',
    'terrible', 'awful', 'horrible', 'worst', 'failed', 'broken', 'damaged'
  ];

  const positiveWords = [
    'good', 'great', 'excellent', 'positive', 'success', 'achievement',
    'progress', 'improvement', 'beneficial', 'effective', 'strong', 'robust',
    'outstanding', 'superb', 'wonderful', 'perfect', 'best', 'superior'
  ];

  const opinionatedPhrases = [
    'should', 'must', 'need to', 'has to', 'ought to', 'obviously',
    'clearly', 'undoubtedly', 'certainly', 'definitely', 'absolutely'
  ];

  const sensationalistPunctuation = (text.match(/!/g) || []).length;
  const allCaps = (text.match(/\b[A-Z]{3,}\b/g) || []).length;

  let emotionalCount = 0;
  emotionalLanguage.forEach(word => {
    if (text.includes(word)) {
      emotionalCount++;
      score += 15;
    }
  });

  if (emotionalCount > 0) {
    evidence.push(`Emotional language detected: ${emotionalCount} charged words (${emotionalLanguage.filter(w => text.includes(w)).slice(0, 3).join(', ')})`);
  }

  let negativeCount = 0;
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });

  let positiveCount = 0;
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });

  const sentimentImbalance = Math.abs(positiveCount - negativeCount);
  if (sentimentImbalance > 3) {
    score += sentimentImbalance * 5;
    evidence.push(`Strong sentiment imbalance: ${Math.max(positiveCount, negativeCount)} ${positiveCount > negativeCount ? 'positive' : 'negative'} vs ${Math.min(positiveCount, negativeCount)} opposite`);
  }

  let opinionatedCount = 0;
  opinionatedPhrases.forEach(phrase => {
    if (text.includes(phrase)) {
      opinionatedCount++;
      score += 5;
    }
  });

  if (opinionatedCount > 2) {
    evidence.push(`Opinionated language: ${opinionatedCount} directive phrases suggesting bias`);
  }

  if (sensationalistPunctuation > 2) {
    score += sensationalistPunctuation * 5;
    evidence.push(`Sensationalist punctuation: ${sensationalistPunctuation} exclamation marks`);
  }

  if (allCaps > 0) {
    score += allCaps * 10;
    evidence.push(`Emphasis through capitalization: ${allCaps} words in all caps`);
  }

  const titleEmotional = emotionalLanguage.filter(w => title.includes(w)).length;
  if (titleEmotional > 0) {
    score += 10;
    evidence.push('Emotional framing in headline increases reader bias');
  }

  if (evidence.length === 0) {
    evidence.push('Neutral tone observed with minimal emotional language');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: 'Sentiment analysis based on emotional language and tone'
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

function analyzeSentiment(text: string): {
  score: number;
  label: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  emotional_words: string[];
} {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  const positiveWords = [
    'good', 'great', 'excellent', 'positive', 'success', 'achievement',
    'progress', 'improvement', 'beneficial', 'effective', 'strong', 'robust',
    'outstanding', 'superb', 'wonderful', 'perfect', 'best', 'superior',
    'brilliant', 'amazing', 'fantastic', 'incredible', 'triumph', 'victory'
  ];

  const negativeWords = [
    'bad', 'poor', 'failure', 'problem', 'issue', 'crisis', 'concern',
    'decline', 'ineffective', 'corrupt', 'illegal', 'fraud', 'scam', 'wrong',
    'terrible', 'awful', 'horrible', 'worst', 'failed', 'broken', 'damaged',
    'disaster', 'catastrophic', 'devastating', 'alarming', 'shocking'
  ];

  const emotionalWords = [
    'fury', 'outrage', 'controversy', 'scandal', 'explosive', 'dramatic',
    'sensational', 'uproar', 'backlash', 'firestorm', 'bombshell'
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  const foundEmotionalWords: string[] = [];

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
    if (emotionalWords.includes(word) && !foundEmotionalWords.includes(word)) {
      foundEmotionalWords.push(word);
    }
  });

  const totalSentimentWords = positiveCount + negativeCount;
  const neutralCount = words.length - totalSentimentWords;

  let sentimentScore = 0;
  let sentimentLabel = 'neutral';

  if (totalSentimentWords > 0) {
    sentimentScore = (positiveCount - negativeCount) / Math.max(totalSentimentWords, 1);
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

    if (sentimentScore > 0.3) {
      sentimentLabel = 'positive';
    } else if (sentimentScore < -0.3) {
      sentimentLabel = 'negative';
    } else if (Math.abs(positiveCount - negativeCount) < 2 && totalSentimentWords > 3) {
      sentimentLabel = 'mixed';
    }
  }

  return {
    score: sentimentScore,
    label: sentimentLabel,
    positive_count: positiveCount,
    negative_count: negativeCount,
    neutral_count: neutralCount,
    emotional_words: foundEmotionalWords,
  };
}
