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

    // New 6 dimensions
    const factualAccuracyBias = analyzeFactualAccuracy(fullText);
    const headlineContentBias = analyzeHeadlineContentMatch(title, content);
    const attributionBias = analyzeAttributionBias(fullText);
    const temporalBias = analyzeTemporalBias(fullText);
    const omissionBias = analyzeOmissionBias(fullText);
    const framingBias = analyzeFramingBias(fullText);

    const overallScore = (
      politicalBias.score +
      regionalBias.score +
      sentimentBias.score +
      sourceReliabilityBias.score +
      representationBias.score +
      languageBias.score +
      factualAccuracyBias.score +
      headlineContentBias.score +
      attributionBias.score +
      temporalBias.score +
      omissionBias.score +
      framingBias.score
    ) / 12;

    let classification = 'Low Bias';
    if (overallScore >= 50) classification = 'High Bias';
    else if (overallScore >= 25) classification = 'Medium Bias';

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
          factual_accuracy_bias: factualAccuracyBias.score,
          headline_content_bias: headlineContentBias.score,
          attribution_bias: attributionBias.score,
          temporal_bias: temporalBias.score,
          omission_bias: omissionBias.score,
          framing_bias: framingBias.score,
          overall_score: Math.round(overallScore),
          classification: classification,
          detailed_analysis: {
            political: politicalBias,
            regional: regionalBias,
            sentiment: sentimentBias,
            source_reliability: sourceReliabilityBias,
            representation: representationBias,
            language: languageBias,
            factual_accuracy: factualAccuracyBias,
            headline_content: headlineContentBias,
            attribution: attributionBias,
            temporal: temporalBias,
            omission: omissionBias,
            framing: framingBias,
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
          factual_accuracy_bias: factualAccuracyBias,
          headline_content_bias: headlineContentBias,
          attribution_bias: attributionBias,
          temporal_bias: temporalBias,
          omission_bias: omissionBias,
          framing_bias: framingBias,
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
  if (totalPartyMentions > 0) {
    score += Math.min(40, totalPartyMentions * 8);
    if (totalPartyMentions > 2) {
      evidence.push(`Heavy political focus (${totalPartyMentions} political entity mentions)`);
    }
  }

  // Loaded/biased political language
  const highBiasTerms = ['alleged', 'claims without evidence', 'propaganda', 'regime', 'puppet', 'vendetta', 'bogus', 'loot'];
  const moderateBiasTerms = ['controversial', 'criticized', 'praised', 'slammed', 'blasted', 'defended', 'attacked', 'accused'];

  highBiasTerms.forEach(term => {
    if (textLower.includes(term)) {
      score += 20;
      evidence.push(`Politically loaded term: '${term}'`);
    }
  });

  moderateBiasTerms.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 10;
      if (count >= 1) evidence.push(`Charged language: '${term}' (${count}x)`);
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

  if (mentionedRegions.length === 1 && totalMentions >= 2) {
    score += Math.min(50, totalMentions * 12);
    evidence.push(`Strong regional focus on ${mentionedRegions[0][0]} (${totalMentions} mentions)`);
  } else if (mentionedRegions.length > 0) {
    score += Math.min(30, mentionedRegions.length * 8);
    if (totalMentions >= 2) {
      evidence.push(`Regional focuses: ${mentionedRegions.map(([r]) => r).join(', ')}`);
    }
  }

  regionalDescriptors.forEach(descriptor => {
    if (textLower.includes(descriptor)) {
      score += 15;
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
      score += count * 18;
      negativeCount += count;
      evidence.push(`Extreme negative: '${term}' (${count}x)`);
    }
  });

  extremePositive.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 18;
      positiveCount += count;
      evidence.push(`Extreme positive: '${term}' (${count}x)`);
    }
  });

  strongNegative.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 10;
      negativeCount += count;
    }
  });

  strongPositive.forEach(term => {
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      score += count * 10;
      positiveCount += count;
    }
  });

  const sentimentImbalance = Math.abs(negativeCount - positiveCount);
  if (sentimentImbalance >= 2) {
    score += sentimentImbalance * 8;
    evidence.push(`Sentiment imbalance: ${negativeCount} negative vs ${positiveCount} positive`);
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
      score += 20;
      weakCount++;
      evidence.push(`Weak sourcing: '${term}'`);
    }
  });

  strongSources.forEach(term => {
    if (textLower.includes(term)) {
      strongCount++;
      score -= 5;
    }
  });

  if (!textLower.includes('according') && !textLower.includes('said') && !textLower.includes('stated')) {
    score += 15;
    evidence.push('No clear source attribution');
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

  if (wordCount < 100) {
    score = 30;
  } else if (perspectiveCount === 0) {
    score = 60;
    evidence.push('Single perspective - no contrasting views');
  } else if (perspectiveCount === 1) {
    score = 40;
    evidence.push('Limited perspective diversity');
  } else if (perspectiveCount === 2) {
    score = 25;
    evidence.push('Some perspective diversity');
  } else {
    score = 10;
    evidence.push(`Multiple viewpoints presented (${perspectiveCount} indicators)`);
  }

  const quoteCount = (text.match(/["'"]/g) || []).length / 2;
  if (quoteCount < 2 && wordCount > 150) {
    score += 15;
    evidence.push('Limited direct quotes from sources');
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
      score += count * 15;
      evidence.push(`Sensational: '${term}' (${count}x)`);
    }
  });

  clickbaitPhrases.forEach(phrase => {
    if (textLower.includes(phrase)) {
      score += 35;
      evidence.push(`Clickbait phrase: '${phrase}'`);
    }
  });

  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (capsWords > 0) {
    score += capsWords * 12;
    evidence.push(`${capsWords} words in ALL CAPS`);
  }

  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 2) {
    score += exclamations * 8;
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

// New Dimension 1: Factual Accuracy Bias
function analyzeFactualAccuracy(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;
  const textLower = text.toLowerCase();

  // Unverified claim indicators
  const unverifiedPhrases = ['some say', 'many believe', 'it is said', 'rumors', 'speculation'];
  const hedgingWords = ['possibly', 'perhaps', 'might', 'could be', 'may have'];
  const absoluteWords = ['always', 'never', 'everyone', 'no one', 'all', 'none'];

  unverifiedPhrases.forEach(phrase => {
    if (textLower.includes(phrase)) {
      score += 20;
      evidence.push(`Unverified claim indicator: '${phrase}'`);
    }
  });

  let hedgingCount = 0;
  hedgingWords.forEach(word => {
    const count = (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    if (count > 0) {
      hedgingCount += count;
    }
  });

  if (hedgingCount > 3) {
    score += hedgingCount * 5;
    evidence.push(`Excessive hedging language (${hedgingCount} instances)`);
  }

  let absoluteCount = 0;
  absoluteWords.forEach(word => {
    const count = (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    if (count > 0) {
      absoluteCount += count;
    }
  });

  if (absoluteCount > 2) {
    score += absoluteCount * 8;
    evidence.push(`Absolute statements without nuance (${absoluteCount} instances)`);
  }

  // Check for numbers without sources
  const hasNumbers = /\d+/.test(text);
  const hasSourceAttribution = textLower.includes('according to') || textLower.includes('data from') || textLower.includes('study');

  if (hasNumbers && !hasSourceAttribution) {
    score += 15;
    evidence.push('Statistics presented without source attribution');
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Significant concerns about factual verification'
    : score > 25
    ? 'Some unverified claims present'
    : 'Reasonable factual grounding';

  return { score, evidence, explanation };
}

// New Dimension 2: Headline-Content Mismatch
function analyzeHeadlineContentMatch(title: string, content: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Clickbait headline indicators
  const clickbaitWords = ['shocking', 'unbelievable', 'you won\'t believe', 'mind-blowing', 'jaw-dropping'];

  clickbaitWords.forEach(word => {
    if (titleLower.includes(word)) {
      score += 25;
      evidence.push(`Clickbait headline: '${word}'`);
    }
  });

  // Question headlines without answers
  if (titleLower.includes('?') && content.length < 200) {
    score += 20;
    evidence.push('Question headline with insufficient content');
  }

  // Extract key entities from headline
  const titleWords = title.split(/\s+/).filter(w => w.length > 4);
  let matchCount = 0;
  titleWords.forEach(word => {
    if (contentLower.includes(word.toLowerCase())) {
      matchCount++;
    }
  });

  const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 1;
  if (matchRatio < 0.5 && titleWords.length > 3) {
    score += 30;
    evidence.push('Headline keywords poorly represented in content');
  }

  // Emotional mismatch
  const emotionalHeadline = /!|shocking|outrage|scandal|crisis/.test(titleLower);
  const neutralContent = !/!/.test(content) && content.length > 100;

  if (emotionalHeadline && neutralContent) {
    score += 15;
    evidence.push('Emotional headline with neutral content');
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Headline significantly misrepresents content'
    : score > 25
    ? 'Some headline-content inconsistency'
    : 'Headline accurately reflects content';

  return { score, evidence, explanation };
}

// New Dimension 3: Attribution Bias
function analyzeAttributionBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;
  const textLower = text.toLowerCase();

  // Count different types of sources
  const anonymousSources = (textLower.match(/sources say|officials say|insiders/g) || []).length;
  const namedSources = (textLower.match(/\w+ \w+ said|\w+ stated/g) || []).length;

  if (anonymousSources > namedSources && anonymousSources > 2) {
    score += 30;
    evidence.push(`Over-reliance on anonymous sources (${anonymousSources} vs ${namedSources} named)`);
  }

  // Single perspective dominance
  const quotePattern = /["']([^"']{20,}?)["']/g;
  const quotes = text.match(quotePattern) || [];

  if (quotes.length === 0 && text.length > 200) {
    score += 25;
    evidence.push('No direct quotes - article lacks diverse voices');
  } else if (quotes.length === 1) {
    score += 15;
    evidence.push('Single voice dominates the narrative');
  }

  // Check for counter-perspectives
  const hasCounterView = textLower.includes('however') || textLower.includes('on the other hand') ||
                         textLower.includes('critics') || textLower.includes('opponents');

  if (!hasCounterView && text.length > 300) {
    score += 20;
    evidence.push('Missing opposing viewpoints or criticism');
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Heavy attribution bias toward one perspective'
    : score > 25
    ? 'Limited diversity in sources cited'
    : 'Balanced source attribution';

  return { score, evidence, explanation };
}

// New Dimension 4: Temporal Bias
function analyzeTemporalBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;
  const textLower = text.toLowerCase();

  // Cherry-picked timeframes
  const selectiveTimeframes = ['in recent months', 'this year', 'recently', 'lately', 'of late'];
  const specificDates = /\d{4}|\d{1,2}\/\d{1,2}|\w+ \d{1,2}/.test(text);

  let vagueTimeCount = 0;
  selectiveTimeframes.forEach(phrase => {
    if (textLower.includes(phrase)) {
      vagueTimeCount++;
    }
  });

  if (vagueTimeCount > 2 && !specificDates) {
    score += 30;
    evidence.push('Vague timeframes without specific dates');
  }

  // Historical context missing
  const comparativeTerms = ['compared to', 'previously', 'historically', 'in the past', 'traditionally'];
  let hasContext = false;
  comparativeTerms.forEach(term => {
    if (textLower.includes(term)) hasContext = true;
  });

  if (!hasContext && text.length > 300) {
    score += 25;
    evidence.push('Lacks historical context or comparison');
  }

  // Recency bias
  const recencyWords = ['unprecedented', 'first time', 'never before', 'historic'];
  let recencyCount = 0;
  recencyWords.forEach(word => {
    if (textLower.includes(word)) {
      recencyCount++;
      score += 15;
    }
  });

  if (recencyCount > 0) {
    evidence.push(`Recency bias: ${recencyCount} instances of exceptional framing`);
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Significant temporal framing concerns'
    : score > 25
    ? 'Some selective use of timeframes'
    : 'Appropriate temporal context';

  return { score, evidence, explanation };
}

// New Dimension 5: Omission Bias
function analyzeOmissionBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;
  const textLower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Article too short for complex topics
  const complexTopicIndicators = ['policy', 'reform', 'legislation', 'scandal', 'crisis', 'conflict'];
  let isComplexTopic = false;
  complexTopicIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) isComplexTopic = true;
  });

  if (isComplexTopic && wordCount < 150) {
    score += 35;
    evidence.push('Complex topic with insufficient detail');
  }

  // Missing key context words
  const contextWords = ['because', 'due to', 'caused by', 'reason', 'background', 'context'];
  let hasContextExplanation = false;
  contextWords.forEach(word => {
    if (textLower.includes(word)) hasContextExplanation = true;
  });

  if (!hasContextExplanation && wordCount > 100) {
    score += 25;
    evidence.push('Missing causal explanation or background');
  }

  // One-sided without acknowledging complexity
  const nuanceWords = ['complicated', 'complex', 'various factors', 'multiple', 'both'];
  let hasNuance = false;
  nuanceWords.forEach(word => {
    if (textLower.includes(word)) hasNuance = true;
  });

  if (!hasNuance && isComplexTopic) {
    score += 20;
    evidence.push('Oversimplification of complex issue');
  }

  // Missing impact or consequences
  const impactWords = ['impact', 'effect', 'consequence', 'result', 'outcome'];
  let hasImpact = false;
  impactWords.forEach(word => {
    if (textLower.includes(word)) hasImpact = true;
  });

  if (!hasImpact && wordCount > 200) {
    score += 15;
    evidence.push('Missing discussion of impacts or consequences');
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Significant omissions in coverage'
    : score > 25
    ? 'Some important context missing'
    : 'Comprehensive coverage';

  return { score, evidence, explanation };
}

// New Dimension 6: Framing Bias
function analyzeFramingBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;
  const textLower = text.toLowerCase();

  // Victim/Perpetrator framing
  const victimWords = ['victim', 'suffering', 'targeted', 'oppressed', 'affected'];
  const perpetratorWords = ['accused', 'guilty', 'responsible', 'blamed', 'culprit'];

  let victimCount = 0;
  victimWords.forEach(word => {
    const count = (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    victimCount += count;
  });

  let perpetratorCount = 0;
  perpetratorWords.forEach(word => {
    const count = (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    perpetratorCount += count;
  });

  const framingImbalance = Math.abs(victimCount - perpetratorCount);
  if (framingImbalance > 3) {
    score += framingImbalance * 8;
    evidence.push(`One-sided framing: ${victimCount} victim vs ${perpetratorCount} perpetrator references`);
  }

  // Problem vs Solution framing
  const problemWords = ['problem', 'issue', 'concern', 'threat', 'danger', 'risk'];
  const solutionWords = ['solution', 'fix', 'resolve', 'address', 'tackle'];

  let problemCount = 0;
  problemWords.forEach(word => {
    if (textLower.includes(word)) problemCount++;
  });

  let solutionCount = 0;
  solutionWords.forEach(word => {
    if (textLower.includes(word)) solutionCount++;
  });

  if (problemCount > 3 && solutionCount === 0) {
    score += 25;
    evidence.push('Problem-focused framing without solutions');
  }

  // Hero/Villain narrative
  const heroWords = ['hero', 'champion', 'defender', 'savior', 'leader'];
  const villainWords = ['villain', 'enemy', 'threat', 'danger', 'menace'];

  let narrativeCount = 0;
  [...heroWords, ...villainWords].forEach(word => {
    if (textLower.includes(word)) narrativeCount++;
  });

  if (narrativeCount > 2) {
    score += narrativeCount * 12;
    evidence.push(`Narrative framing: ${narrativeCount} hero/villain terms`);
  }

  // Us vs Them framing
  const divisiveWords = ['us vs them', 'our side', 'their side', 'enemy', 'ally'];
  divisiveWords.forEach(word => {
    if (textLower.includes(word)) {
      score += 20;
      evidence.push(`Divisive framing: '${word}'`);
    }
  });

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Heavy use of biased framing'
    : score > 25
    ? 'Some framing bias present'
    : 'Neutral framing';

  return { score, evidence, explanation };
}
