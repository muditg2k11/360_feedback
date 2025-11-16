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
  let score = 35;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const politicalKeywords = ['election', 'vote', 'party', 'minister', 'government', 'politics', 'pm', 'chief minister', 'mla', 'mp', 'bjp', 'congress', 'parliament', 'assembly'];
  const hasPoliticalContent = politicalKeywords.some(k => text.includes(k));

  if (hasPoliticalContent) {
    score += 15;
    explanations.push('Political content inherently carries institutional and ideological bias');
  }

  const politicalParties = [
    { name: 'BJP', keywords: ['bjp', 'bharatiya janata', 'modi', 'narendra modi', 'saffron', 'nda', 'lotus'] },
    { name: 'Congress', keywords: ['congress', 'inc', 'rahul gandhi', 'sonia gandhi', 'upa', 'hand symbol'] },
    { name: 'AAP', keywords: ['aap', 'aam aadmi', 'kejriwal', 'arvind kejriwal', 'broom'] },
    { name: 'TMC', keywords: ['tmc', 'trinamool', 'mamata', 'mamata banerjee', 'grassroot'] },
    { name: 'DMK', keywords: ['dmk', 'stalin', 'dravida munnetra', 'rising sun'] },
  ];

  const positiveWords = ['achievement', 'success', 'hero', 'visionary', 'strong', 'development', 'progress', 'excellent', 'praised', 'lauded', 'acclaimed', 'revolutionary', 'transformative', 'brilliant', 'outstanding', 'commendable', 'historic', 'landmark'];
  const negativeWords = ['failure', 'corrupt', 'scam', 'scandal', 'dictator', 'authoritarian', 'criticized', 'slammed', 'attacked', 'accused', 'failed', 'incompetent', 'chaos', 'mismanagement', 'disaster', 'blunder', 'setback', 'controversy'];

  const partyCounts: Record<string, { positive: number; negative: number; neutral: number; contexts: string[] }> = {};

  for (const party of politicalParties) {
    partyCounts[party.name] = { positive: 0, negative: 0, neutral: 0, contexts: [] };

    for (const keyword of party.keywords) {
      if (text.includes(keyword)) {
        partyCounts[party.name].neutral++;

        const context = extractContext(text, keyword, 80);
        partyCounts[party.name].contexts.push(context);

        for (const posWord of positiveWords) {
          if (context.includes(posWord)) {
            partyCounts[party.name].positive++;
          }
        }

        for (const negWord of negativeWords) {
          if (context.includes(negWord)) {
            partyCounts[party.name].negative++;
          }
        }
      }
    }
  }

  const mentionedParties = Object.entries(partyCounts).filter(([_, data]) => data.neutral > 0);

  if (mentionedParties.length === 1) {
    score += 25;
    evidence.push(`Article focuses exclusively on ${mentionedParties[0][0]}, lacking opposing viewpoints`);
    explanations.push(`Single-party narrative without counter-perspectives represents ${mentionedParties[0][0]} bias`);
  }

  for (const [partyName, counts] of mentionedParties) {
    const total = counts.positive + counts.negative;
    if (total >= 2) {
      const imbalance = Math.abs(counts.positive - counts.negative) / total;

      if (imbalance > 0.7) {
        score += 45;
        const sentiment = counts.positive > counts.negative ? 'positive' : 'negative';
        evidence.push(`Heavily ${sentiment} framing of ${partyName}: ${counts.positive} positive vs ${counts.negative} negative mentions`);
        explanations.push(`Article shows ${(imbalance * 100).toFixed(0)}% ${sentiment} bias towards ${partyName}`);
        if (counts.contexts[0]) {
          evidence.push(`Example: "${counts.contexts[0].substring(0, 100)}..."`);
        }
      } else if (imbalance > 0.5) {
        score += 30;
        const sentiment = counts.positive > counts.negative ? 'positive' : 'negative';
        explanations.push(`Noticeable ${sentiment} leaning in ${partyName} coverage`);
      }
    } else if (counts.neutral >= 3 && total === 0) {
      score += 20;
      evidence.push(`${partyName} mentioned ${counts.neutral} times without substantive analysis or opposing views`);
      explanations.push('Multiple mentions without balanced context indicates promotional coverage');
    }
  }

  const governmentKeywords = ['government', 'policy', 'minister', 'official', 'administration', 'cabinet', 'pm', 'chief minister'];
  let govMentions = 0;
  for (const keyword of governmentKeywords) {
    govMentions += (text.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
  }

  if (govMentions > 5) {
    const positiveGovCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeGovCount = negativeWords.filter(w => text.includes(w)).length;

    if (positiveGovCount + negativeGovCount > 0) {
      const govBias = Math.abs(positiveGovCount - negativeGovCount) / (positiveGovCount + negativeGovCount);
      if (govBias > 0.6) {
        score += 35;
        if (positiveGovCount > negativeGovCount) {
          explanations.push(`Pro-establishment bias: ${positiveGovCount} positive vs ${negativeGovCount} negative government references`);
          evidence.push('Article functions as government promotion rather than critical journalism');
        } else {
          explanations.push(`Anti-establishment bias: ${negativeGovCount} negative vs ${positiveGovCount} positive government references`);
          evidence.push('Article adopts adversarial stance without balanced reporting');
        }
      }
    }
  }

  const oppositionKeywords = ['opposition', 'rival', 'critic', 'dissent', 'protest'];
  let oppMentions = 0;
  for (const keyword of oppositionKeywords) {
    oppMentions += (text.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
  }

  if (govMentions > 8 && oppMentions === 0) {
    score += 25;
    evidence.push('Article covers government extensively but completely ignores opposition perspective');
    explanations.push('Systematic exclusion of dissenting voices indicates structural bias');
  }

  if (evidence.length === 0) {
    evidence.push('Political content detected but requires monitoring for subtle bias');
    explanations.push('Article contains political elements - default caution score applied for oversight');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Political content requires careful monitoring.',
  };
}

function analyzeRegionalBias(text: string, title: string): BiasScore {
  let score = 40;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const regionalKeywords = ['state', 'region', 'city', 'district', 'area', 'zone', 'territory'];
  const hasRegionalContent = regionalKeywords.some(k => text.includes(k));

  if (hasRegionalContent) {
    score += 10;
    explanations.push('Geographic content typically reflects location-based editorial bias');
  }

  const regions = [
    { name: 'North India', keywords: ['delhi', 'punjab', 'haryana', 'up', 'uttar pradesh', 'rajasthan', 'uttarakhand', 'himachal', 'ncr', 'capital'] },
    { name: 'South India', keywords: ['tamil nadu', 'karnataka', 'kerala', 'andhra', 'telangana', 'chennai', 'bangalore', 'bengaluru', 'hyderabad', 'kochi'] },
    { name: 'East India', keywords: ['west bengal', 'odisha', 'bihar', 'jharkhand', 'kolkata', 'calcutta', 'bhubaneswar'] },
    { name: 'West India', keywords: ['maharashtra', 'gujarat', 'goa', 'mumbai', 'pune', 'ahmedabad', 'bombay'] },
    { name: 'Northeast', keywords: ['assam', 'manipur', 'meghalaya', 'nagaland', 'tripura', 'mizoram', 'arunachal', 'guwahati', 'imphal'] },
    { name: 'Central India', keywords: ['madhya pradesh', 'chhattisgarh', 'indore', 'bhopal', 'raipur'] },
  ];

  const positiveRegionalWords = ['developed', 'progressive', 'advanced', 'model', 'successful', 'thriving', 'prosperous', 'leading', 'cosmopolitan', 'modern', 'hub', 'powerhouse'];
  const negativeRegionalWords = ['backward', 'underdeveloped', 'poor', 'lagging', 'struggling', 'crisis', 'problem', 'neglected', 'remote', 'isolated', 'deprived', 'deficient'];

  const regionMentions: Record<string, { count: number; sentiment: number; contexts: string[] }> = {};

  for (const region of regions) {
    regionMentions[region.name] = { count: 0, sentiment: 0, contexts: [] };

    for (const keyword of region.keywords) {
      if (text.includes(keyword)) {
        regionMentions[region.name].count++;

        const context = extractContext(text, keyword, 80);
        regionMentions[region.name].contexts.push(context);

        for (const posWord of positiveRegionalWords) {
          if (context.includes(posWord)) {
            regionMentions[region.name].sentiment++;
          }
        }

        for (const negWord of negativeRegionalWords) {
          if (context.includes(negWord)) {
            regionMentions[region.name].sentiment--;
          }
        }
      }
    }
  }

  const mentionedRegions = Object.entries(regionMentions).filter(([_, data]) => data.count > 0);

  if (mentionedRegions.length === 1 && mentionedRegions[0][1].count >= 3) {
    score += 30;
    evidence.push(`Article exhibits strong ${mentionedRegions[0][0]} centrism with no pan-India perspective`);
    explanations.push('Geographical myopia - failing to represent national diversity');
  } else if (mentionedRegions.length === 2) {
    score += 15;
    evidence.push('Limited to two regions, excludes significant parts of India');
  }

  for (const [regionName, data] of mentionedRegions) {
    if (Math.abs(data.sentiment) >= 2) {
      score += 40;
      if (data.sentiment > 0) {
        evidence.push(`${regionName} portrayed with clear positive bias (score: +${data.sentiment})`);
        explanations.push(`Romanticized representation of ${regionName} without acknowledging complexities`);
      } else {
        evidence.push(`${regionName} portrayed with clear negative bias (score: ${data.sentiment})`);
        explanations.push(`Disparaging coverage of ${regionName} perpetuates regional stereotypes`);
      }
      if (data.contexts[0]) {
        evidence.push(`Example: "${data.contexts[0].substring(0, 100)}..."`);
      }
    }
  }

  const comparativeWords = ['better than', 'worse than', 'unlike', 'compared to', 'while', 'whereas', 'superior', 'inferior', 'ahead of', 'behind'];
  let comparisonCount = 0;
  for (const word of comparativeWords) {
    if (text.includes(word)) {
      comparisonCount++;
      score += 12;
    }
  }

  if (comparisonCount >= 2) {
    evidence.push(`${comparisonCount} comparative framings create regional hierarchy`);
    explanations.push('Comparative language establishes biased regional rankings');
  }

  const metropolitanBias = ['delhi', 'mumbai', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad'].filter(city => text.includes(city)).length;
  const ruralMention = text.includes('rural') || text.includes('village') || text.includes('countryside');

  if (metropolitanBias >= 2 && !ruralMention) {
    score += 20;
    evidence.push('Urban-centric narrative completely ignores rural India (70% of population)');
    explanations.push('Metropolitan bias marginalizes majority of Indian population');
  }

  if (evidence.length === 0) {
    evidence.push('Regional content detected, monitoring for geographical favoritism');
    explanations.push('Geographic scope limited - default monitoring score applied');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Regional elements require monitoring.',
  };
}

function analyzeSentimentBias(text: string, title: string): BiasScore {
  let score = 45;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const emotionalWords = [
    'shocking', 'outrageous', 'unbelievable', 'devastating', 'horrific',
    'explosive', 'sensational', 'dramatic', 'stunning', 'alarming',
    'catastrophic', 'crisis', 'emergency', 'urgent', 'critical', 'terrifying',
    'horrifying', 'appalling', 'disgraceful', 'shameful', 'scandalous'
  ];

  const exaggerations = [
    'completely', 'totally', 'absolutely', 'entirely', 'utterly',
    'all', 'none', 'never', 'always', 'everyone', 'no one', 'every single',
    'impossible', 'unprecedented', 'unheard of'
  ];

  const oneSidedIndicators = [
    'clearly', 'obviously', 'undoubtedly', 'certainly', 'without question',
    'there is no doubt', 'it is clear that', 'everyone knows', 'of course',
    'naturally', 'inevitably', 'must', 'cannot be denied'
  ];

  let emotionalCount = 0;
  const foundEmotionalWords: string[] = [];
  for (const word of emotionalWords) {
    if (text.includes(word)) {
      emotionalCount++;
      foundEmotionalWords.push(word);
    }
  }

  if (emotionalCount >= 4) {
    score += 45;
    evidence.push(`Highly charged language: uses ${emotionalCount} emotional trigger words including "${foundEmotionalWords.slice(0, 3).join('", "')}"`);
    explanations.push('Manipulative emotional framing designed to provoke rather than inform');
  } else if (emotionalCount >= 2) {
    score += 30;
    evidence.push(`Emotional manipulation detected: "${foundEmotionalWords.slice(0, 2).join('", "')}"`);
    explanations.push('Uses emotional triggers instead of neutral reporting');
  } else if (emotionalCount >= 1) {
    score += 15;
    explanations.push('Contains emotionally charged terminology');
  }

  let exaggerationCount = 0;
  const foundExaggerations: string[] = [];
  for (const word of exaggerations) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      exaggerationCount += matches.length;
      if (!foundExaggerations.includes(word)) foundExaggerations.push(word);
    }
  }

  if (exaggerationCount >= 6) {
    score += 35;
    evidence.push(`Excessive absolutes: ${exaggerationCount} instances of extreme language like "${foundExaggerations.slice(0, 3).join('", "')}"`);
    explanations.push('Hyperbolic language eliminates nuance and complexity');
  } else if (exaggerationCount >= 3) {
    score += 20;
    evidence.push(`Multiple absolute statements: "${foundExaggerations.slice(0, 2).join('", "')}"`);
    explanations.push('Exaggerated claims present opinions as universal truths');
  }

  let oneSidedCount = 0;
  const foundOneSided: string[] = [];
  for (const phrase of oneSidedIndicators) {
    if (text.includes(phrase)) {
      oneSidedCount++;
      foundOneSided.push(phrase);
    }
  }

  if (oneSidedCount >= 3) {
    score += 40;
    evidence.push(`Presents subjective opinions as facts: ${oneSidedCount} instances including "${foundOneSided.slice(0, 2).join('", "')}"`);
    explanations.push('Dogmatic framing rejects alternative interpretations');
  } else if (oneSidedCount >= 1) {
    score += 20;
    evidence.push(`Opinion framed as certainty: "${foundOneSided[0]}"`);
    explanations.push('Subjective views presented as objective reality');
  }

  const titleEmotionalCount = emotionalWords.filter(word => title.includes(word)).length;
  if (titleEmotionalCount >= 2) {
    score += 30;
    evidence.push('Headline employs multiple emotional manipulation tactics');
    explanations.push('Sensationalized headline prioritizes engagement over accuracy');
  } else if (titleEmotionalCount >= 1) {
    score += 20;
    evidence.push('Emotionally manipulative headline');
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 4) {
    score += 20;
    evidence.push(`Excessive exclamation marks (${exclamationCount}) indicate emotional rather than factual reporting`);
  } else if (exclamationCount >= 2) {
    score += 10;
    evidence.push(`Multiple exclamation marks (${exclamationCount}) add unnecessary drama`);
  }

  const capsCount = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (capsCount >= 2) {
    score += 15;
    evidence.push(`${capsCount} instances of ALL CAPS for emphasis - tabloid technique`);
    explanations.push('Typographical shouting replaces substantive argumentation');
  }

  if (evidence.length === 0) {
    evidence.push('Tone analysis suggests potential for bias - monitoring recommended');
    explanations.push('Writing style exhibits characteristics requiring oversight');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Sentiment elements require monitoring.',
  };
}

function analyzeSourceReliability(text: string, title: string): BiasScore {
  let score = 50;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const reliableIndicators = [
    'according to', 'sources say', 'reported', 'confirmed', 'official statement',
    'data shows', 'study finds', 'research indicates', 'statistics reveal',
    'expert', 'analyst', 'professor', 'spokesperson', 'announced'
  ];

  const unreliableIndicators = [
    'allegedly', 'rumored', 'unconfirmed', 'anonymous sources', 'speculation',
    'it is believed', 'some say', 'reports suggest', 'might', 'could be',
    'possibly', 'potentially', 'sources claim', 'insiders say', 'reportedly'
  ];

  const clickbaitPhrases = [
    'you won\'t believe', 'shocking truth', 'what happens next', 'this is what',
    'the reason will shock you', 'wait till you see', 'will surprise you',
    'doctors hate', 'one simple trick', 'what they don\'t want'
  ];

  let reliableCount = 0;
  let unreliableCount = 0;

  for (const indicator of reliableIndicators) {
    if (text.includes(indicator)) {
      reliableCount++;
    }
  }

  for (const indicator of unreliableIndicators) {
    if (text.includes(indicator)) {
      unreliableCount++;
      evidence.push(`Unverified claim: "${indicator}"`);
    }
  }

  if (unreliableCount >= 5) {
    score += 50;
    evidence.push(`Article relies heavily on speculation: ${unreliableCount} unverified statements`);
    explanations.push('Predominantly speculative content masquerading as factual reporting');
  } else if (unreliableCount >= 3) {
    score += 35;
    explanations.push(`${unreliableCount} instances of unverified information undermine credibility`);
  } else if (unreliableCount >= 1) {
    score += 20;
    explanations.push('Contains unsubstantiated claims');
  }

  if (reliableCount === 0 && text.length > 300) {
    score += 35;
    evidence.push('Zero source attribution in substantial article');
    explanations.push('Complete absence of verifiable sources indicates opinion piece presented as news');
  } else if (reliableCount <= 1 && text.length > 500) {
    score += 25;
    evidence.push('Minimal source attribution for lengthy content');
    explanations.push('Insufficient sourcing for article length suggests poor journalistic standards');
  }

  for (const phrase of clickbaitPhrases) {
    if (title.includes(phrase)) {
      score += 50;
      evidence.push(`Clickbait headline detected: "${phrase}"`);
      explanations.push('Manipulative headline tactics prioritize clicks over truth');
      break;
    }
  }

  const factsRegex = /\d+(\.\d+)?%|\d+ percent|\d+ crore|\d+ billion|\d+ million|\d+ thousand|\d+ lakh/gi;
  const factMatches = text.match(factsRegex);
  const hasFacts = factMatches && factMatches.length >= 2;

  if (!hasFacts && text.length > 500) {
    score += 25;
    evidence.push('Extended article lacks concrete data, statistics, or quantifiable facts');
    explanations.push('Opinion-heavy content without empirical evidence');
  }

  const quotesRegex = /["'""'']/g;
  const quoteMatches = text.match(quotesRegex);
  const quotesCount = quoteMatches ? Math.floor(quoteMatches.length / 2) : 0;

  if (quotesCount === 0 && text.length > 500) {
    score += 25;
    evidence.push('No direct quotes from any source in substantial article');
    explanations.push('Absence of direct quotes suggests paraphrasing without accountability');
  }

  const anonymousSource = text.includes('anonymous') || text.includes('unnamed') || text.includes('sources said');
  if (anonymousSource && reliableCount <= 1) {
    score += 20;
    evidence.push('Relies on anonymous sources without corroborating verified information');
    explanations.push('Anonymous sourcing without verification enables agenda-driven reporting');
  }

  if (evidence.length === 0) {
    evidence.push('Sourcing quality requires verification');
    explanations.push('Article credibility needs independent assessment');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Source reliability requires verification.',
  };
}

function analyzeRepresentationBias(text: string, title: string): BiasScore {
  let score = 45;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const stakeholderGroups = [
    { name: 'Government/Officials', keywords: ['minister', 'official', 'government', 'bureaucrat', 'administration', 'spokesperson', 'secretary'] },
    { name: 'Opposition', keywords: ['opposition', 'rival party', 'critic', 'dissident', 'protester'] },
    { name: 'Citizens/Public', keywords: ['citizen', 'public', 'people', 'resident', 'voter', 'community', 'locals'] },
    { name: 'Experts', keywords: ['expert', 'analyst', 'professor', 'researcher', 'economist', 'scientist', 'academic'] },
    { name: 'Civil Society', keywords: ['activist', 'ngo', 'civil society', 'volunteer', 'organization', 'advocacy'] },
    { name: 'Business/Industry', keywords: ['business', 'industry', 'corporate', 'company', 'entrepreneur', 'ceo'] },
  ];

  const representation: Record<string, number> = {};
  const voiceGiven: Record<string, boolean> = {};

  for (const group of stakeholderGroups) {
    representation[group.name] = 0;
    voiceGiven[group.name] = false;

    for (const keyword of group.keywords) {
      const regex = new RegExp(`\\b${keyword}`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        representation[group.name] += matches.length;
      }

      if (text.includes(`${keyword} said`) || text.includes(`${keyword} stated`) ||
          text.includes(`${keyword} explained`) || text.includes(`${keyword} argued`)) {
        voiceGiven[group.name] = true;
      }
    }
  }

  const totalMentions = Object.values(representation).reduce((a, b) => a + b, 0);
  const voicesGiven = Object.values(voiceGiven).filter(v => v).length;
  const mentionedGroups = Object.entries(representation).filter(([_, count]) => count > 0);

  if (totalMentions > 0) {
    const maxMention = Math.max(...Object.values(representation));
    const dominance = maxMention / totalMentions;

    if (dominance > 0.75 && voicesGiven <= 1) {
      score += 50;
      const dominantGroup = Object.entries(representation).find(([_, count]) => count === maxMention)?.[0];
      evidence.push(`${dominantGroup} monopolizes narrative: ${(dominance * 100).toFixed(0)}% of all stakeholder mentions`);
      explanations.push(`Severe imbalance - single perspective dominates while excluding other stakeholders`);
    } else if (dominance > 0.6 && voicesGiven <= 2) {
      score += 35;
      const dominantGroup = Object.entries(representation).find(([_, count]) => count === maxMention)?.[0];
      evidence.push(`${dominantGroup} dominates: ${(dominance * 100).toFixed(0)}% of stakeholder mentions`);
      explanations.push('Unbalanced representation favors one perspective');
    }
  }

  if (voicesGiven === 0 && text.length > 400) {
    score += 40;
    evidence.push('No direct voices from any stakeholder in substantial article');
    explanations.push('Absence of direct representation suggests third-party interpretation without accountability');
  } else if (voicesGiven === 1 && mentionedGroups.length >= 3) {
    score += 30;
    evidence.push('Multiple stakeholders mentioned but only one given voice');
    explanations.push('Selective amplification while silencing other perspectives');
  } else if (voicesGiven === 2 && mentionedGroups.length >= 4) {
    score += 20;
    evidence.push('Limited voice representation despite multiple stakeholders');
    explanations.push('Narrow perspective in multi-stakeholder issue');
  }

  const marginalized = [
    'women', 'minorities', 'tribal', 'dalit', 'adivasi', 'disabled', 'farmer', 'worker', 'labour',
    'migrant', 'rural', 'poor', 'vulnerable', 'slum', 'informal sector', 'unorganized'
  ];

  let marginalizedMentioned = false;
  let marginalizedVoice = false;
  const marginalizedGroups: string[] = [];

  for (const group of marginalized) {
    if (text.includes(group)) {
      marginalizedMentioned = true;
      marginalizedGroups.push(group);
      if (text.includes(`${group} said`) || text.includes(`${group}s said`) ||
          text.includes(`${group} stated`) || text.includes(`${group}s stated`)) {
        marginalizedVoice = true;
      }
    }
  }

  if (marginalizedMentioned && !marginalizedVoice) {
    score += 35;
    evidence.push(`Marginalized groups (${marginalizedGroups.slice(0, 3).join(', ')}) discussed but not heard`);
    explanations.push('Article talks about vulnerable populations without amplifying their voices - extractive journalism');
  }

  if (representation['Government/Officials'] > 10 && representation['Citizens/Public'] === 0) {
    score += 30;
    evidence.push('Extensive government coverage with zero citizen perspective');
    explanations.push('Top-down narrative excludes ground-level reality');
  }

  if (evidence.length === 0) {
    evidence.push('Stakeholder representation requires diversity audit');
    explanations.push('Voice distribution needs equity assessment');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Representation patterns require monitoring.',
  };
}

function analyzeLanguageBias(text: string, title: string, originalText: string): BiasScore {
  let score = 40;
  const evidence: string[] = [];
  const explanations: string[] = [];

  const loadedWords = [
    { word: 'regime', neutral: 'government', bias: 'negative' },
    { word: 'propaganda', neutral: 'information', bias: 'negative' },
    { word: 'mob', neutral: 'crowd', bias: 'negative' },
    { word: 'riot', neutral: 'protest', bias: 'negative' },
    { word: 'militant', neutral: 'activist', bias: 'negative' },
    { word: 'thug', neutral: 'person', bias: 'negative' },
    { word: 'radical', neutral: 'progressive', bias: 'negative' },
    { word: 'extremist', neutral: 'activist', bias: 'negative' },
  ];

  const stereotypingPhrases = [
    'typically', 'usually', 'always', 'never', 'all of them',
    'these people', 'they all', 'known for', 'notorious',
    'as expected', 'predictably', 'characteristically'
  ];

  const misleadingFrames = [
    'raises questions about', 'casts doubt on', 'suggests that',
    'appears to', 'seems to', 'many believe', 'concerns are growing',
    'critics say', 'some argue', 'debate rages'
  ];

  const foundLoadedWords: Array<{ word: string; neutral: string }> = [];
  for (const item of loadedWords) {
    const regex = new RegExp(`\\b${item.word}\\b`, 'gi');
    if (text.match(regex)) {
      foundLoadedWords.push(item);
    }
  }

  if (foundLoadedWords.length >= 4) {
    score += 45;
    evidence.push(`Heavily loaded language: ${foundLoadedWords.length} biased terms including "${foundLoadedWords.slice(0, 3).map(w => w.word).join('", "')}"`);
    explanations.push(`Substitutes neutral terms with emotionally charged alternatives`);
    evidence.push(`Could use neutral alternatives: ${foundLoadedWords.slice(0, 2).map(w => `"${w.word}" � "${w.neutral}"`).join(', ')}`);
  } else if (foundLoadedWords.length >= 2) {
    score += 30;
    evidence.push(`Loaded terminology: "${foundLoadedWords.map(w => w.word).join('", "')}"`);
    explanations.push('Language choices reveal underlying bias');
  } else if (foundLoadedWords.length >= 1) {
    score += 15;
    evidence.push(`Biased term: "${foundLoadedWords[0].word}" instead of neutral "${foundLoadedWords[0].neutral}"`);
  }

  const foundStereotypes: string[] = [];
  for (const phrase of stereotypingPhrases) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    if (text.match(regex)) {
      foundStereotypes.push(phrase);
    }
  }

  if (foundStereotypes.length >= 4) {
    score += 40;
    evidence.push(`Rampant stereotyping: ${foundStereotypes.length} generalizing phrases`);
    explanations.push('Reduces complex realities to harmful stereotypes');
  } else if (foundStereotypes.length >= 2) {
    score += 25;
    evidence.push(`Stereotyping language: "${foundStereotypes.slice(0, 2).join('", "')}"`);
    explanations.push('Generalizations obscure individual agency and diversity');
  }

  const foundMisleading: string[] = [];
  for (const phrase of misleadingFrames) {
    if (text.includes(phrase)) {
      foundMisleading.push(phrase);
    }
  }

  if (foundMisleading.length >= 3) {
    score += 35;
    evidence.push(`Manipulative framing: ${foundMisleading.length} instances of indirect assertion`);
    explanations.push('Implies claims without stating them directly - plausible deniability tactic');
    evidence.push(`Examples: "${foundMisleading.slice(0, 2).join('", "')}"`);
  } else if (foundMisleading.length >= 1) {
    score += 20;
    evidence.push(`Indirect claim: "${foundMisleading[0]}"`);
    explanations.push('Insinuation without evidence or accountability');
  }

  const quotationContext = /"[^"]+"|'[^']+'|"[^"]+"|'[^']+'/g;
  const quotes = originalText.match(quotationContext) || [];

  let dismissiveQuotes = 0;
  for (const quote of quotes) {
    const quoteIndex = originalText.indexOf(quote);
    const beforeQuote = originalText.substring(Math.max(0, quoteIndex - 60), quoteIndex).toLowerCase();

    if (beforeQuote.includes('claimed') || beforeQuote.includes('alleged') ||
        beforeQuote.includes('so-called') || beforeQuote.includes('merely')) {
      dismissiveQuotes++;
    }
  }

  if (dismissiveQuotes >= 2) {
    score += 30;
    evidence.push(`${dismissiveQuotes} quotes framed with dismissive language`);
    explanations.push('Selective discrediting through framing undermines quoted sources');
  } else if (dismissiveQuotes >= 1) {
    score += 15;
    evidence.push('Quote(s) framed dismissively to undermine credibility');
  }

  const passiveVoice = (text.match(/\b(is|are|was|were|been|be|being)\s+\w+ed\b/gi) || []).length;
  const activeVoice = (text.match(/\b(said|reported|announced|declared|stated|confirmed)\b/gi) || []).length;

  if (passiveVoice > activeVoice * 2 && passiveVoice > 5) {
    score += 20;
    evidence.push('Excessive passive voice obscures agency and accountability');
    explanations.push('Passive constructions hide who is responsible for actions');
  }

  if (evidence.length === 0) {
    evidence.push('Language patterns suggest potential bias - monitoring warranted');
    explanations.push('Word choices and framing require ongoing scrutiny');
  }

  return {
    score: Math.min(score, 100),
    evidence: evidence.slice(0, 5),
    explanation: explanations.join('. ') || 'Language analysis requires monitoring.',
  };
}

function extractContext(text: string, keyword: string, windowSize: number): string {
  const index = text.indexOf(keyword);
  if (index === -1) return '';

  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + keyword.length + windowSize);

  return text.substring(start, end);
}
