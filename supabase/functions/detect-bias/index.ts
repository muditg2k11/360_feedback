import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BiasAnalysis {
  score: number;
  evidence: string[];
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, content, feedbackId } = await req.json();
    const fullText = `${title} ${content}`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const politicalBias = analyzePoliticalBias(fullText);
    const regionalBias = analyzeRegionalBias(fullText);
    const sentimentBias = analyzeSentimentBias(fullText);
    const sourceReliabilityBias = analyzeSourceReliability(fullText);
    const representationBias = analyzeRepresentation(fullText);
    const languageBias = analyzeLanguageBias(fullText);

    const overallScore = (
      politicalBias.score +
      regionalBias.score +
      sentimentBias.score +
      sourceReliabilityBias.score +
      representationBias.score +
      languageBias.score
    ) / 6;

    let classification = 'Low Bias';
    if (overallScore >= 60) classification = 'High Bias';
    else if (overallScore >= 30) classification = 'Medium Bias';

    const sentimentAnalysis = {
      score: 0,
      label: 'neutral',
      confidence: 0.8,
      topics: [],
      entities: [],
      keywords: []
    };

    if (feedbackId) {
      const { error: upsertError } = await supabase.from('ai_analyses').upsert({
        feedback_id: feedbackId,
        sentiment_score: sentimentAnalysis.score,
        sentiment_label: sentimentAnalysis.label,
        topics: sentimentAnalysis.topics,
        entities: sentimentAnalysis.entities,
        keywords: sentimentAnalysis.keywords,
        language_detected: detectLanguage(fullText),
        confidence_score: sentimentAnalysis.confidence,
        bias_indicators: {
          political_bias: politicalBias.score,
          regional_bias: regionalBias.score,
          sentiment_bias: sentimentBias.score,
          source_reliability_bias: sourceReliabilityBias.score,
          representation_bias: representationBias.score,
          language_bias: languageBias.score,
          overall_score: Math.round(overallScore),
          classification: classification,
          detailed_analysis: {
            political: politicalBias,
            regional: regionalBias,
            sentiment: sentimentBias,
            source_reliability: sourceReliabilityBias,
            representation: representationBias,
            language: languageBias,
          },
        },
      }, { onConflict: 'feedback_id' });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw new Error(`Failed to save analysis: ${upsertError.message}`);
      }

      const { error: updateError } = await supabase.from('feedback_items').update({ status: 'analyzed' }).eq('id', feedbackId);

      if (updateError) {
        console.error('Status update error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          overall_score: Math.round(overallScore),
          classification,
          political_bias: politicalBias,
          regional_bias: regionalBias,
          sentiment_bias: sentimentBias,
          source_reliability_bias: sourceReliabilityBias,
          representation_bias: representationBias,
          language_bias: languageBias,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function analyzePoliticalBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Political party and figure mentions (contextual)
  const partyTerms = {
    'bjp': 0, 'congress': 0, 'modi': 0, 'gandhi': 0, 'aap': 0,
    'left': 0, 'right': 0, 'liberal': 0, 'conservative': 0
  };

  Object.keys(partyTerms).forEach(term => {
    const matches = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (matches > 0) partyTerms[term] = matches;
  });

  const totalPartyMentions = Object.values(partyTerms).reduce((a, b) => a + b, 0);
  if (totalPartyMentions > 3) {
    score += Math.min(25, totalPartyMentions * 3);
    evidence.push(`Frequent political entity mentions (${totalPartyMentions} times)`);
  }

  // Loaded/biased political language
  const highBiasTerms = ['alleged', 'claims without evidence', 'propaganda', 'regime', 'puppet'];
  const moderateBiasTerms = ['controversial', 'criticized', 'praised', 'slammed', 'blasted', 'defended', 'attacked'];

  highBiasTerms.forEach(term => {
    if (textLower.includes(term)) {
      score += 15;
      evidence.push(`Uses politically loaded term '${term}'`);
    }
  });

  moderateBiasTerms.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 5;
      if (count >= 2) evidence.push(`Charged term '${term}' used ${count} times`);
    }
  });

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Significant political bias and loaded language detected'
    : score > 20
    ? 'Some political framing present'
    : 'Minimal political bias';

  return { score, evidence, explanation };
}

function analyzeRegionalBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();

  // Major Indian cities
  const regions = {
    'delhi': 0, 'mumbai': 0, 'kolkata': 0, 'chennai': 0,
    'bangalore': 0, 'hyderabad': 0, 'pune': 0, 'ahmedabad': 0
  };

  // Regional descriptors
  const regionalDescriptors = ['north india', 'south india', 'east india', 'west india', 'northeast'];

  Object.keys(regions).forEach(region => {
    const matches = (textLower.match(new RegExp(`\\b${region}\\b`, 'g')) || []).length;
    if (matches > 0) regions[region] = matches;
  });

  const mentionedRegions = Object.entries(regions).filter(([_, count]) => count > 0);
  const totalMentions = mentionedRegions.reduce((sum, [_, count]) => sum + count, 0);

  if (mentionedRegions.length === 1 && totalMentions > 2) {
    score += Math.min(40, totalMentions * 8);
    evidence.push(`Heavy focus on ${mentionedRegions[0][0]} (${totalMentions} mentions)`);
  } else if (mentionedRegions.length > 0) {
    score += Math.min(20, mentionedRegions.length * 4);
    if (totalMentions > 4) {
      evidence.push(`Multiple regional focuses: ${mentionedRegions.map(([r]) => r).join(', ')}`);
    }
  }

  regionalDescriptors.forEach(descriptor => {
    if (textLower.includes(descriptor)) {
      score += 10;
      evidence.push(`Regional framing: '${descriptor}'`);
    }
  });

  score = Math.min(100, score);

  const explanation = score > 40
    ? 'Strong regional focus may limit broader perspective'
    : score > 15
    ? 'Some regional emphasis present'
    : 'Balanced geographic coverage';

  return { score, evidence, explanation };
}

function analyzeSentimentBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();

  // Extreme sentiment words
  const extremeNegative = ['crisis', 'disaster', 'catastrophe', 'scandal', 'outrage', 'chaos', 'corruption', 'fraud'];
  const extremePositive = ['triumph', 'miraculous', 'revolutionary', 'historic victory'];

  // Strong sentiment words
  const strongNegative = ['failure', 'problem', 'concern', 'criticism', 'opposition', 'conflict'];
  const strongPositive = ['success', 'achievement', 'breakthrough', 'victory', 'progress'];

  let negativeCount = 0;
  let positiveCount = 0;

  extremeNegative.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 12;
      negativeCount += count;
      evidence.push(`Extreme negative: '${term}' (${count}x)`);
    }
  });

  extremePositive.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 12;
      positiveCount += count;
      evidence.push(`Extreme positive: '${term}' (${count}x)`);
    }
  });

  strongNegative.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 6;
      negativeCount += count;
    }
  });

  strongPositive.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 6;
      positiveCount += count;
    }
  });

  const sentimentImbalance = Math.abs(negativeCount - positiveCount);
  if (sentimentImbalance > 3) {
    score += sentimentImbalance * 3;
    evidence.push(`One-sided sentiment (${negativeCount} negative vs ${positiveCount} positive)`);
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Highly emotionally charged language'
    : score > 25
    ? 'Noticeable sentiment bias'
    : 'Relatively balanced sentiment';

  return { score, evidence, explanation };
}

function analyzeSourceReliability(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();

  // Weak sourcing indicators
  const weakSources = ['sources say', 'reportedly', 'allegedly', 'rumors suggest', 'insiders claim', 'unconfirmed'];
  const strongSources = ['according to', 'official statement', 'confirmed', 'data shows', 'research indicates'];

  let weakCount = 0;
  let strongCount = 0;

  weakSources.forEach(term => {
    if (textLower.includes(term)) {
      score += 15;
      weakCount++;
      evidence.push(`Weak sourcing: '${term}'`);
    }
  });

  strongSources.forEach(term => {
    if (textLower.includes(term)) {
      strongCount++;
      score -= 10; // Reduce score for good sourcing
    }
  });

  // Lack of any source attribution
  if (!textLower.includes('according') && !textLower.includes('said') && !textLower.includes('stated')) {
    score += 8;
    evidence.push('Limited source attribution');
  }

  score = Math.max(0, Math.min(100, score));

  const explanation = score > 40
    ? 'Significant sourcing concerns'
    : score > 15
    ? 'Some sourcing reliability issues'
    : 'Adequate source attribution';

  return { score, evidence, explanation };
}

function analyzeRepresentation(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Look for diverse perspectives
  const perspectiveIndicators = [
    'however', 'but', 'on the other hand', 'alternatively', 'critics say',
    'supporters argue', 'opponents claim', 'proponents state', 'while others'
  ];

  let perspectiveCount = 0;
  perspectiveIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) {
      perspectiveCount++;
    }
  });

  // Short articles get baseline score
  if (wordCount < 100) {
    score = 20;
  } else if (perspectiveCount === 0) {
    score = 45;
    evidence.push('No contrasting perspectives presented');
  } else if (perspectiveCount === 1) {
    score = 25;
    evidence.push('Limited perspective diversity');
  } else {
    score = 10;
    evidence.push(`Multiple viewpoints presented (${perspectiveCount} indicators)`);
  }

  // Check for direct quotes
  const quoteCount = (text.match(/["'"]/g) || []).length / 2;
  if (quoteCount < 2 && wordCount > 150) {
    score += 10;
    evidence.push('Few direct quotes or voices');
  }

  score = Math.min(100, score);

  const explanation = score > 40
    ? 'Limited representation of diverse viewpoints'
    : score > 20
    ? 'Some perspective diversity'
    : 'Multiple perspectives represented';

  return { score, evidence, explanation };
}

function analyzeLanguageBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const textLower = text.toLowerCase();

  // Sensational language
  const sensationalTerms = ['shocking', 'stunning', 'explosive', 'bombshell', 'unbelievable', 'incredible', 'dramatic'];
  const clickbaitPhrases = ['you won\'t believe', 'this will', 'what happens next', 'the truth about'];

  sensationalTerms.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 10;
      evidence.push(`Sensational: '${term}' (${count}x)`);
    }
  });

  clickbaitPhrases.forEach(phrase => {
    if (textLower.includes(phrase)) {
      score += 25;
      evidence.push(`Clickbait phrase: '${phrase}'`);
    }
  });

  // Excessive capitalization or exclamation
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (capsWords > 0) {
    score += capsWords * 8;
    evidence.push(`${capsWords} words in ALL CAPS`);
  }

  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 2) {
    score += exclamations * 5;
    evidence.push(`Excessive exclamation marks (${exclamations})`);
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Highly sensational language'
    : score > 25
    ? 'Some sensationalism present'
    : 'Professional language tone';

  return { score, evidence, explanation };
}

function detectLanguage(text: string): string {
  const hindiPattern = /[\u0900-\u097F]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  const kannadaPattern = /[\u0C80-\u0CFF]/;

  if (hindiPattern.test(text)) return 'Hindi';
  if (tamilPattern.test(text)) return 'Tamil';
  if (teluguPattern.test(text)) return 'Telugu';
  if (kannadaPattern.test(text)) return 'Kannada';
  return 'English';
}
