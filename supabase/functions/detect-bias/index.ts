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
    return new Response(null, { status: 200, headers: corsHeaders });
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            overall_score: biasAnalysis.overall_score,
            classification: biasAnalysis.classification,
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-bias:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectBias(text: string, title: string, originalContent: string): BiasAnalysisResult {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const politicalBias = analyzePoliticalBias(lowerText, lowerTitle);
  const regionalBias = analyzeRegionalBias(lowerText, lowerTitle);
  const sentimentBias = analyzeSentimentBias(lowerText, lowerTitle);
  const sourceReliabilityBias = analyzeSourceReliability(lowerText, lowerTitle);
  const representationBias = analyzeRepresentationBias(lowerText, lowerTitle);
  const languageBias = analyzeLanguageBias(lowerText, lowerTitle, originalContent);

  const overallScore = (
    politicalBias.score +
    regionalBias.score +
    sentimentBias.score +
    sourceReliabilityBias.score +
    representationBias.score +
    languageBias.score
  ) / 6;

  let classification: 'High Bias' | 'Medium Bias' | 'Low Bias';
  if (overallScore >= 70) {
    classification = 'High Bias';
  } else if (overallScore >= 40) {
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
    overall_score: Math.round(overallScore * 100) / 100,
    classification,
  };
}

function analyzePoliticalBias(text: string, title: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const proGovtTerms = ['announces', 'launches', 'inaugurates', 'achievement', 'success', 'progress', 'development', 'milestone', 'historic'];
  const antiGovtTerms = ['fails', 'criticism', 'protest', 'controversy', 'scandal', 'corruption', 'inefficiency', 'condemn'];
  const polarizingTerms = ['bjp', 'congress', 'modi', 'gandhi', 'left', 'right', 'opposition', 'ruling'];
  const strongOpinions = ['must', 'should', 'never', 'always', 'only', 'obviously', 'clearly'];

  let proCount = 0;
  let antiCount = 0;

  proGovtTerms.forEach(term => {
    if (text.includes(term)) {
      proCount++;
      if (title.includes(term)) proCount++;
    }
  });

  antiGovtTerms.forEach(term => {
    if (text.includes(term)) {
      antiCount++;
      if (title.includes(term)) antiCount++;
    }
  });

  const polarizingCount = polarizingTerms.filter(t => text.includes(t)).length;
  const opinionCount = strongOpinions.filter(t => text.includes(t)).length;

  if (proCount > 3 || antiCount > 3) {
    score += 30;
    evidence.push(`Strong ${proCount > antiCount ? 'pro' : 'anti'}-government language detected`);
  }

  if (polarizingCount > 2) {
    score += 20;
    evidence.push(`Multiple political party references (${polarizingCount}) suggest partisan framing`);
  }

  if (opinionCount > 2) {
    score += 15;
    evidence.push(`Prescriptive language detected (${opinionCount} instances)`);
  }

  if (Math.abs(proCount - antiCount) > 3) {
    score += 25;
    evidence.push('Significant imbalance in positive vs negative political framing');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Minimal political bias detected',
  };
}

function analyzeRegionalBias(text: string, title: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const regions = ['north', 'south', 'east', 'west', 'central', 'northeast'];
  const states = ['delhi', 'mumbai', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'gujarat', 'bihar', 'kerala'];
  const urbanRural = ['urban', 'rural', 'village', 'city', 'metro'];

  const regionMentions = regions.filter(r => text.includes(r)).length;
  const stateMentions = states.filter(s => text.includes(s)).length;
  const urbanRuralMentions = urbanRural.filter(u => text.includes(u)).length;

  if (stateMentions > 3) {
    score += 20;
    evidence.push(`Heavy focus on specific regions (${stateMentions} states mentioned)`);
  }

  if (text.includes('urban') && !text.includes('rural')) {
    score += 25;
    evidence.push('Urban-centric perspective, rural viewpoints absent');
  } else if (text.includes('rural') && !text.includes('urban')) {
    score += 15;
    evidence.push('Rural-focused narrative');
  }

  if (regionMentions === 0 && stateMentions > 0) {
    score += 15;
    evidence.push('Narrow geographic scope limits national perspective');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Balanced regional representation',
  };
}

function analyzeSentimentBias(text: string, title: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const negativeWords = ['crisis', 'disaster', 'collapse', 'chaos', 'failure', 'threat', 'danger', 'worst', 'terrible'];
  const positiveWords = ['excellent', 'outstanding', 'perfect', 'best', 'wonderful', 'amazing', 'brilliant'];
  const emotionalWords = ['outrage', 'fury', 'shock', 'horror', 'devastation', 'ecstatic', 'thrilled'];

  const negCount = negativeWords.filter(w => text.includes(w)).length;
  const posCount = positiveWords.filter(w => text.includes(w)).length;
  const emotCount = emotionalWords.filter(w => text.includes(w)).length;

  if (negCount > 3 || posCount > 3) {
    score += 30;
    evidence.push(`Heavily ${negCount > posCount ? 'negative' : 'positive'} language (${Math.max(negCount, posCount)} loaded terms)`);
  }

  if (emotCount > 2) {
    score += 25;
    evidence.push(`Emotional language detected (${emotCount} instances) instead of factual reporting`);
  }

  if (Math.abs(negCount - posCount) > 3) {
    score += 20;
    evidence.push('Significant sentiment imbalance in word choice');
  }

  if (title.split(' ').some(w => negativeWords.includes(w.toLowerCase()))) {
    score += 15;
    evidence.push('Negative framing in headline');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Neutral sentiment maintained',
  };
}

function analyzeSourceReliability(text: string, title: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const unverifiedTerms = ['allegedly', 'reportedly', 'sources say', 'rumor', 'claims', 'according to'];
  const certainTerms = ['confirmed', 'verified', 'officially', 'stated', 'announced'];
  const anonymousSource = text.includes('anonymous') || text.includes('unnamed');
  const quotedSources = (text.match(/"/g) || []).length / 2;

  const unverifiedCount = unverifiedTerms.filter(t => text.includes(t)).length;
  const certainCount = certainTerms.filter(t => text.includes(t)).length;

  if (unverifiedCount > 2) {
    score += 25;
    evidence.push(`Multiple unverified claims (${unverifiedCount} instances)`);
  }

  if (anonymousSource && quotedSources < 2) {
    score += 30;
    evidence.push('Reliance on anonymous sources without corroboration');
  }

  if (certainCount === 0 && unverifiedCount > 0) {
    score += 20;
    evidence.push('Lack of verified sources or official statements');
  }

  if (text.includes('social media') || text.includes('twitter') || text.includes('facebook')) {
    score += 15;
    evidence.push('Social media cited as primary source');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Reliable sourcing practices observed',
  };
}

function analyzeRepresentationBias(text: string, title: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const perspectives = ['government', 'opposition', 'expert', 'citizen', 'activist', 'official'];
  const viewpoints = perspectives.filter(p => text.includes(p)).length;

  const oneWord = ['only', 'just', 'merely', 'simply'];
  const exclusiveCount = oneWord.filter(w => text.includes(w)).length;

  if (viewpoints < 2) {
    score += 35;
    evidence.push('Single perspective presented, lacking diverse viewpoints');
  }

  if (exclusiveCount > 2) {
    score += 20;
    evidence.push(`Exclusionary language (${exclusiveCount} instances) limits representation`);
  }

  if (!text.includes('however') && !text.includes('but') && !text.includes('although')) {
    score += 25;
    evidence.push('No counterarguments or alternative perspectives presented');
  }

  const quotesFromGovt = /government|minister|official/.test(text) && (text.match(/"/g) || []).length > 2;
  const quotesFromOthers = /critic|opposition|expert|activist/.test(text) && (text.match(/"/g) || []).length > 2;

  if (quotesFromGovt && !quotesFromOthers) {
    score += 20;
    evidence.push('Only government voices quoted directly');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Diverse perspectives represented',
  };
}

function analyzeLanguageBias(text: string, title: string, originalContent: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];

  const sensationalWords = ['shocking', 'explosive', 'bombshell', 'stunning', 'unprecedented'];
  const clickbaitPhrases = ['you won\'t believe', 'what happened next', 'shocking truth'];
  const exaggerations = ['never', 'always', 'everyone', 'nobody', 'best ever', 'worst ever'];

  const sensationalCount = sensationalWords.filter(w => title.toLowerCase().includes(w)).length;
  const clickbaitCount = clickbaitPhrases.filter(p => title.toLowerCase().includes(p)).length;
  const exaggerationCount = exaggerations.filter(e => text.includes(e)).length;

  if (sensationalCount > 0) {
    score += 30;
    evidence.push(`Sensational headline (${sensationalCount} loaded terms)`);
  }

  if (clickbaitCount > 0) {
    score += 40;
    evidence.push('Clickbait-style headline detected');
  }

  if (exaggerationCount > 3) {
    score += 20;
    evidence.push(`Exaggerated language (${exaggerationCount} absolute terms)`);
  }

  if (title.includes('!') || title.includes('?!')) {
    score += 15;
    evidence.push('Excessive punctuation in headline for emphasis');
  }

  return {
    score: Math.min(100, score),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Neutral, professional language used',
  };
}

function analyzeSentiment(text: string): { score: number; label: string } {
  const lowerText = text.toLowerCase();

  const positiveWords = ['good', 'great', 'excellent', 'success', 'win', 'progress', 'improve', 'benefit', 'positive', 'achieve'];
  const negativeWords = ['bad', 'fail', 'crisis', 'problem', 'issue', 'concern', 'decline', 'loss', 'negative', 'threat'];
  const mixedWords = ['but', 'however', 'although', 'despite', 'yet'];

  let positiveCount = 0;
  let negativeCount = 0;
  let mixedCount = 0;

  positiveWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, 'g'));
    if (matches) positiveCount += matches.length;
  });

  negativeWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, 'g'));
    if (matches) negativeCount += matches.length;
  });

  mixedWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, 'g'));
    if (matches) mixedCount += matches.length;
  });

  const total = positiveCount + negativeCount + 1;
  const score = (positiveCount - negativeCount) / total;

  let label: string;
  if (mixedCount > 2) {
    label = 'mixed';
  } else if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  return { score: Math.max(-1, Math.min(1, score)), label };
}
