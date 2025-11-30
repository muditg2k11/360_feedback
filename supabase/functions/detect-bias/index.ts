import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BiasScore {
  score: number;
  evidence: string[];
  explanation: string;
  indicators: { [key: string]: number };
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

    const { title, content, feedbackId } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and content required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullText = `${title} ${content}`;
    const lowerText = fullText.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 0);
    const sentences = fullText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);

    const politicalBias = analyzePoliticalBias(lowerText, lowerTitle, words, sentences, title);
    const regionalBias = analyzeRegionalBias(lowerText, lowerTitle, words, sentences);
    const sentimentBias = analyzeSentimentBias(lowerText, lowerTitle, words, sentences, title);
    const sourceReliabilityBias = analyzeSourceReliability(lowerText, lowerTitle, words, sentences);
    const representationBias = analyzeRepresentationBias(lowerText, lowerTitle, words, sentences);
    const languageBias = analyzeLanguageBias(lowerText, lowerTitle, words, sentences, title);

    const overallScore = (
      politicalBias.score +
      regionalBias.score +
      sentimentBias.score +
      sourceReliabilityBias.score +
      representationBias.score +
      languageBias.score
    ) / 6;

    let classification: string;
    if (overallScore >= 65) {
      classification = 'High Bias';
    } else if (overallScore >= 35) {
      classification = 'Medium Bias';
    } else {
      classification = 'Low Bias';
    }

    const sentimentAnalysis = analyzeSentiment(fullText, title, words);

    if (feedbackId) {
      await supabase.from('ai_analyses').upsert({
        feedback_id: feedbackId,
        sentiment_score: sentimentAnalysis.score,
        sentiment_label: sentimentAnalysis.label,
        topics: sentimentAnalysis.topics,
        entities: sentimentAnalysis.entities,
        keywords: sentimentAnalysis.keywords,
        language_detected: detectLanguage(fullText),
        confidence_score: sentimentAnalysis.confidence,
        bias_indicators: {
          political_bias: politicalBias.score / 100,
          regional_bias: regionalBias.score / 100,
          sentiment_bias: sentimentBias.score / 100,
          source_reliability_bias: sourceReliabilityBias.score / 100,
          representation_bias: representationBias.score / 100,
          language_bias: languageBias.score / 100,
          overall_score: Math.round(overallScore * 100) / 100,
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

      await supabase.from('feedback_items').update({ status: 'analyzed' }).eq('id', feedbackId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          political_bias: politicalBias,
          regional_bias: regionalBias,
          sentiment_bias: sentimentBias,
          source_reliability_bias: sourceReliabilityBias,
          representation_bias: representationBias,
          language_bias: languageBias,
          overall_score: Math.round(overallScore * 100) / 100,
          classification
        },
        sentiment: sentimentAnalysis
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzePoliticalBias(text: string, title: string, words: string[], sentences: string[], originalTitle: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const proGovtWords = {
    strong: ['historic', 'revolutionary', 'landmark', 'unprecedented', 'visionary', 'transformative'],
    moderate: ['announces', 'launches', 'inaugurates', 'implements', 'introduces', 'unveils'],
    positive: ['achievement', 'success', 'progress', 'development', 'milestone', 'growth', 'advancement']
  };

  const antiGovtWords = {
    strong: ['scandal', 'corruption', 'failure', 'disaster', 'catastrophe', 'crisis', 'blunder', 'fiasco'],
    moderate: ['criticism', 'protest', 'controversy', 'opposition', 'dispute', 'conflict'],
    negative: ['fails', 'inefficiency', 'condemn', 'reject', 'oppose', 'challenge']
  };

  const politicalParties = ['bjp', 'congress', 'aap', 'tmc', 'dmk', 'trs', 'ysr', 'shiv sena', 'ncp', 'left', 'cpi'];
  const politicalLeaders = ['modi', 'gandhi', 'rahul', 'kejriwal', 'mamata', 'yogi', 'amit shah', 'sonia', 'priyanka'];
  const governmentTerms = ['government', 'minister', 'ministry', 'pm', 'chief minister', 'cabinet', 'centre', 'state govt'];
  const opinionWords = ['must', 'should', 'ought to', 'need to', 'needs to', 'has to', 'obviously', 'clearly', 'undoubtedly', 'certainly'];

  let proStrongCount = 0, proModerateCount = 0, proPositiveCount = 0;
  let antiStrongCount = 0, antiModerateCount = 0, antiNegativeCount = 0;

  const titleWeight = 3;
  const sentenceStartWeight = 1.5;

  proGovtWords.strong.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    proStrongCount += contentMatches + (titleMatches * titleWeight);
  });

  proGovtWords.moderate.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    proModerateCount += contentMatches + (titleMatches * titleWeight);
  });

  proGovtWords.positive.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    proPositiveCount += contentMatches + (titleMatches * titleWeight);
  });

  antiGovtWords.strong.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    antiStrongCount += contentMatches + (titleMatches * titleWeight);
  });

  antiGovtWords.moderate.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    antiModerateCount += contentMatches + (titleMatches * titleWeight);
  });

  antiGovtWords.negative.forEach(word => {
    const contentMatches = (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    const titleMatches = (title.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    antiNegativeCount += contentMatches + (titleMatches * titleWeight);
  });

  const proTotal = (proStrongCount * 3) + (proModerateCount * 2) + proPositiveCount;
  const antiTotal = (antiStrongCount * 3) + (antiModerateCount * 2) + antiNegativeCount;
  const totalPoliticalLanguage = proTotal + antiTotal;

  if (totalPoliticalLanguage > 8) {
    const biasDirection = proTotal > antiTotal ? 'pro-government' : 'anti-government';
    const pts = Math.min(40, totalPoliticalLanguage * 2.5);
    score += pts;
    evidence.push(`Heavy ${biasDirection} language (weighted score: ${Math.round(totalPoliticalLanguage)})`);
    indicators['political_language'] = pts;
  } else if (totalPoliticalLanguage > 4) {
    const biasDirection = proTotal > antiTotal ? 'pro-government' : 'anti-government';
    const pts = Math.min(25, totalPoliticalLanguage * 3);
    score += pts;
    evidence.push(`Noticeable ${biasDirection} framing (${Math.round(totalPoliticalLanguage)} instances)`);
    indicators['political_language'] = pts;
  } else if (totalPoliticalLanguage > 1) {
    const pts = totalPoliticalLanguage * 2;
    score += pts;
    indicators['political_language'] = pts;
  }

  if (totalPoliticalLanguage > 2) {
    const imbalanceRatio = Math.abs(proTotal - antiTotal) / totalPoliticalLanguage;
    if (imbalanceRatio > 0.8) {
      const pts = Math.min(30, imbalanceRatio * 35);
      score += pts;
      evidence.push(`Severe political imbalance (${Math.round(imbalanceRatio * 100)}% one-sided)`);
      indicators['imbalance'] = pts;
    } else if (imbalanceRatio > 0.6) {
      const pts = Math.min(20, imbalanceRatio * 30);
      score += pts;
      evidence.push(`Significant political slant (${Math.round(imbalanceRatio * 100)}% skew)`);
      indicators['imbalance'] = pts;
    } else if (imbalanceRatio > 0.4) {
      const pts = imbalanceRatio * 15;
      score += pts;
      indicators['imbalance'] = pts;
    }
  }

  const partyMentions = politicalParties.filter(p => text.includes(p)).length;
  const leaderMentions = politicalLeaders.filter(l => text.includes(l)).length;
  const polarizingTotal = partyMentions + leaderMentions;

  if (polarizingTotal > 5) {
    const pts = Math.min(25, polarizingTotal * 3.5);
    score += pts;
    evidence.push(`Excessive partisan references (${polarizingTotal} parties/leaders) - hyper-political focus`);
    indicators['partisan'] = pts;
  } else if (polarizingTotal > 3) {
    const pts = Math.min(18, polarizingTotal * 4);
    score += pts;
    evidence.push(`Multiple partisan mentions (${polarizingTotal}) suggest ideological angle`);
    indicators['partisan'] = pts;
  } else if (polarizingTotal > 1) {
    const pts = polarizingTotal * 3;
    score += pts;
    indicators['partisan'] = pts;
  }

  const opinionCount = opinionWords.filter(w => text.includes(w)).length;
  const govtMentions = governmentTerms.filter(t => text.includes(t)).length;

  if (opinionCount > 4 && govtMentions > 2) {
    const pts = Math.min(20, opinionCount * 2.5);
    score += pts;
    evidence.push(`Prescriptive language (${opinionCount} instances) - advocacy over reporting`);
    indicators['prescriptive'] = pts;
  } else if (opinionCount > 2) {
    const pts = Math.min(12, opinionCount * 3);
    score += pts;
    evidence.push(`Opinion-based framing detected (${opinionCount} prescriptive terms)`);
    indicators['prescriptive'] = pts;
  }

  const quotesCount = (text.match(/"/g) || []).length / 2;
  const hasGovtQuotes = /government|minister|official|spokesperson/.test(text) && quotesCount > 1;
  const hasOppositionQuotes = /opposition|critic|protest|dissent/.test(text) && quotesCount > 1;

  if (hasGovtQuotes && !hasOppositionQuotes && totalPoliticalLanguage > 3) {
    score += 15;
    evidence.push('One-sided quotes - only government perspective directly quoted');
    indicators['one_sided_quotes'] = 15;
  } else if (hasOppositionQuotes && !hasGovtQuotes && totalPoliticalLanguage > 3) {
    score += 15;
    evidence.push('One-sided quotes - only opposition/critics directly quoted');
    indicators['one_sided_quotes'] = 15;
  }

  const allCapsWords = (originalTitle.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (allCapsWords > 0 && (proStrongCount > 0 || antiStrongCount > 0)) {
    score += 8;
    evidence.push('ALL CAPS in political headline amplifies bias');
    indicators['emphasis'] = 8;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Neutral political reporting - balanced and factual',
    indicators
  };
}

function analyzeRegionalBias(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const majorMetros = ['delhi', 'mumbai', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad'];
  const allStates = ['delhi', 'mumbai', 'maharashtra', 'bengaluru', 'karnataka', 'chennai', 'tamil nadu', 'kolkata', 'west bengal',
                     'hyderabad', 'telangana', 'gujarat', 'uttar pradesh', 'up', 'bihar', 'kerala', 'punjab', 'rajasthan',
                     'madhya pradesh', 'mp', 'odisha', 'assam', 'jharkhand', 'haryana'];
  const urbanTerms = ['urban', 'city', 'metro', 'metropolitan', 'cosmopolitan', 'tier-1', 'tier-2'];
  const ruralTerms = ['rural', 'village', 'gram', 'countryside', 'farmers', 'agricultural', 'tribal', 'remote'];
  const regions = ['north', 'south', 'east', 'west', 'central', 'northeast', 'northern', 'southern', 'eastern', 'western'];

  const metroCount = majorMetros.filter(m => text.includes(m)).length;
  const stateCount = allStates.filter(s => text.includes(s)).length;
  const urbanCount = urbanTerms.filter(u => text.includes(u)).length;
  const ruralCount = ruralTerms.filter(r => text.includes(r)).length;
  const regionCount = regions.filter(r => text.includes(r)).length;

  const wordCount = words.length;
  const isLongArticle = wordCount > 200;

  if (stateCount > 6) {
    const pts = Math.min(30, stateCount * 3);
    score += pts;
    evidence.push(`Excessive geographic concentration (${stateCount} states) - lacks national coherence`);
    indicators['geographic_overload'] = pts;
  } else if (stateCount > 3 && isLongArticle) {
    const pts = Math.min(20, stateCount * 4);
    score += pts;
    evidence.push(`Scattered regional focus (${stateCount} states) dilutes key message`);
    indicators['geographic_scatter'] = pts;
  }

  if (stateCount === 1 && isLongArticle && regionCount === 0) {
    score += 22;
    evidence.push('Single-state tunnel vision in substantial article - missing national context');
    indicators['narrow_geography'] = 22;
  } else if (stateCount === 1 && wordCount > 100) {
    score += 12;
    evidence.push('Limited geographic scope - single location focus');
    indicators['narrow_geography'] = 12;
  }

  const urbanRuralTotal = urbanCount + ruralCount;
  if ((urbanCount > 3 && ruralCount === 0) || (ruralCount > 3 && urbanCount === 0)) {
    const pts = Math.min(35, Math.abs(urbanCount - ruralCount) * 6);
    score += pts;
    evidence.push(`${urbanCount > ruralCount ? 'Urban' : 'Rural'}-centric bias - completely ignores ${urbanCount > ruralCount ? 'rural' : 'urban'} reality`);
    indicators['urban_rural_divide'] = pts;
  } else if ((urbanCount > 1 && ruralCount === 0) || (ruralCount > 1 && urbanCount === 0)) {
    const pts = Math.min(20, Math.abs(urbanCount - ruralCount) * 4);
    score += pts;
    evidence.push(`${urbanCount > ruralCount ? 'Urban' : 'Rural'}-focused perspective missing balance`);
    indicators['urban_rural_imbalance'] = pts;
  }

  if (metroCount > 4 && stateCount < 3) {
    score += 25;
    evidence.push(`Metro-bubble bias (${metroCount} major cities) - excludes tier-2/3 cities and rural India`);
    indicators['metro_centric'] = 25;
  } else if (metroCount > 2 && stateCount < 2) {
    score += 15;
    evidence.push('Big city focus neglects smaller towns and villages');
    indicators['metro_centric'] = 15;
  }

  if (regionCount === 0 && stateCount > 2 && isLongArticle) {
    score += 12;
    evidence.push('Lacks regional context - states mentioned without broader geographic framing');
    indicators['missing_context'] = 12;
  }

  const northStates = ['delhi', 'punjab', 'haryana', 'uttar pradesh', 'up', 'rajasthan', 'jammu'];
  const southStates = ['kerala', 'tamil nadu', 'chennai', 'karnataka', 'bengaluru', 'bangalore', 'hyderabad', 'telangana'];
  const northCount = northStates.filter(s => text.includes(s)).length;
  const southCount = southStates.filter(s => text.includes(s)).length;

  if ((northCount > 2 && southCount === 0) || (southCount > 2 && northCount === 0)) {
    score += 18;
    evidence.push(`${northCount > southCount ? 'North' : 'South'} India bias - ignores other regions entirely`);
    indicators['regional_divide'] = 18;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Balanced regional coverage - pan-India perspective',
    indicators
  };
}

function analyzeSentimentBias(text: string, title: string, words: string[], sentences: string[], originalTitle: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const extremeNegative = ['catastrophe', 'disaster', 'nightmare', 'horror', 'tragic', 'devastating', 'horrific', 'appalling', 'terrible'];
  const strongNegative = ['crisis', 'collapse', 'chaos', 'failure', 'threat', 'danger', 'worst', 'alarming'];
  const moderateNegative = ['problem', 'issue', 'concern', 'worry', 'difficulty', 'challenge', 'setback'];

  const extremePositive = ['magnificent', 'spectacular', 'phenomenal', 'extraordinary', 'remarkable', 'outstanding'];
  const strongPositive = ['excellent', 'perfect', 'brilliant', 'amazing', 'wonderful', 'fantastic'];
  const moderatePositive = ['good', 'positive', 'beneficial', 'favorable', 'promising'];

  const emotionalWords = ['outrage', 'fury', 'anger', 'rage', 'shock', 'horror', 'devastation', 'ecstatic', 'thrilled', 'jubilant'];
  const intensifiers = ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'utterly', 'highly', 'deeply'];
  const dramaticWords = ['dramatic', 'shocking', 'stunning', 'explosive', 'sensational'];

  let extremeNegCount = 0, strongNegCount = 0, moderateNegCount = 0;
  let extremePosCount = 0, strongPosCount = 0, moderatePosCount = 0;

  const titleWeight = 2.5;

  extremeNegative.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    extremeNegCount += contentCount + (titleCount * titleWeight);
  });

  strongNegative.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    strongNegCount += contentCount + (titleCount * titleWeight);
  });

  moderateNegative.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    moderateNegCount += contentCount;
  });

  extremePositive.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    extremePosCount += contentCount + (titleCount * titleWeight);
  });

  strongPositive.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    strongPosCount += contentCount + (titleCount * titleWeight);
  });

  moderatePositive.forEach(w => {
    const contentCount = (text.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    moderatePosCount += contentCount;
  });

  const totalNegative = (extremeNegCount * 4) + (strongNegCount * 2.5) + moderateNegCount;
  const totalPositive = (extremePosCount * 4) + (strongPosCount * 2.5) + moderatePosCount;
  const sentimentTotal = totalNegative + totalPositive;

  if (extremeNegCount > 2 || extremePosCount > 2) {
    const intensity = Math.max(extremeNegCount, extremePosCount);
    const pts = Math.min(40, intensity * 10);
    score += pts;
    evidence.push(`Extreme ${extremeNegCount > extremePosCount ? 'negative' : 'positive'} language (${Math.round(intensity)} instances) - emotional manipulation`);
    indicators['extreme_language'] = pts;
  }

  if (strongNegCount > 3 || strongPosCount > 3) {
    const intensity = Math.max(strongNegCount, strongPosCount);
    const pts = Math.min(30, intensity * 5);
    score += pts;
    evidence.push(`Heavy ${strongNegCount > strongPosCount ? 'negative' : 'positive'} tone (${Math.round(intensity)} charged terms)`);
    indicators['charged_language'] = pts;
  } else if (strongNegCount > 1 || strongPosCount > 1) {
    const intensity = Math.max(strongNegCount, strongPosCount);
    const pts = intensity * 6;
    score += pts;
    indicators['charged_language'] = pts;
  }

  if (sentimentTotal > 4) {
    const imbalance = Math.abs(totalNegative - totalPositive) / sentimentTotal;
    if (imbalance > 0.75) {
      const pts = Math.min(30, imbalance * 35);
      score += pts;
      evidence.push(`Extreme sentiment imbalance (${Math.round(imbalance * 100)}% one-sided) - lacks objectivity`);
      indicators['sentiment_imbalance'] = pts;
    } else if (imbalance > 0.5) {
      const pts = Math.min(20, imbalance * 30);
      score += pts;
      evidence.push(`Sentiment skew (${Math.round(imbalance * 100)}%) compromises neutrality`);
      indicators['sentiment_imbalance'] = pts;
    }
  }

  const emotionalCount = emotionalWords.filter(w => text.includes(w)).length;
  if (emotionalCount > 3) {
    const pts = Math.min(28, emotionalCount * 6);
    score += pts;
    evidence.push(`Emotional language (${emotionalCount} instances) replaces factual analysis`);
    indicators['emotional'] = pts;
  } else if (emotionalCount > 1) {
    const pts = emotionalCount * 7;
    score += pts;
    indicators['emotional'] = pts;
  }

  const intensifierCount = intensifiers.filter(w => text.includes(w)).length;
  if (intensifierCount > 5) {
    const pts = Math.min(18, intensifierCount * 2);
    score += pts;
    evidence.push(`Excessive intensifiers (${intensifierCount}) amplify emotional impact artificially`);
    indicators['intensifiers'] = pts;
  } else if (intensifierCount > 3) {
    const pts = intensifierCount * 2.5;
    score += pts;
    indicators['intensifiers'] = pts;
  }

  const dramaticCount = dramaticWords.filter(w => title.includes(w)).length;
  if (dramaticCount > 0) {
    score += 15;
    evidence.push('Dramatic headline framing manipulates reader perception');
    indicators['headline_drama'] = 15;
  }

  const titleHasExtreme = extremeNegative.some(w => title.includes(w)) || extremePositive.some(w => title.includes(w));
  if (titleHasExtreme) {
    score += 18;
    evidence.push('Emotionally charged headline sets biased tone');
    indicators['headline_emotion'] = 18;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Neutral sentiment - objective and balanced tone',
    indicators
  };
}

function analyzeSourceReliability(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const unverifiedTerms = ['allegedly', 'reportedly', 'sources say', 'sources said', 'rumor', 'rumoured', 'claims', 'claimed', 'purportedly'];
  const speculativeTerms = ['might', 'could', 'may', 'possibly', 'likely', 'expected to', 'believed to'];
  const verifiedTerms = ['confirmed', 'verified', 'officially', 'stated', 'announced', 'declared', 'certified'];
  const weakSources = ['social media', 'twitter', 'facebook', 'whatsapp', 'viral', 'circulating', 'trending'];
  const strongSources = ['government', 'official statement', 'ministry', 'spokesperson', 'press conference', 'press release'];

  let unverifiedCount = 0, speculativeCount = 0, verifiedCount = 0;

  unverifiedTerms.forEach(t => {
    unverifiedCount += (text.match(new RegExp(t, 'gi')) || []).length;
  });

  speculativeTerms.forEach(t => {
    speculativeCount += (text.match(new RegExp(`\\b${t}\\b`, 'gi')) || []).length;
  });

  verifiedTerms.forEach(t => {
    verifiedCount += (text.match(new RegExp(`\\b${t}\\b`, 'gi')) || []).length;
  });

  const weakSourceCount = weakSources.filter(s => text.includes(s)).length;
  const strongSourceCount = strongSources.filter(s => text.includes(s)).length;

  const hasAnonymous = /anonymous|unnamed|sources who|sources requesting anonymity/.test(text);
  const quotesCount = (text.match(/"/g) || []).length / 2;
  const hasNamedSources = /said \w+|according to \w+ \w+|spokesperson \w+/.test(text);

  if (unverifiedCount > 5) {
    const pts = Math.min(35, unverifiedCount * 5);
    score += pts;
    evidence.push(`Heavy reliance on unverified claims (${unverifiedCount} instances) - credibility compromised`);
    indicators['unverified'] = pts;
  } else if (unverifiedCount > 2) {
    const pts = Math.min(25, unverifiedCount * 6);
    score += pts;
    evidence.push(`Multiple unverified claims (${unverifiedCount}) weaken factual basis`);
    indicators['unverified'] = pts;
  } else if (unverifiedCount > 0) {
    const pts = unverifiedCount * 8;
    score += pts;
    indicators['unverified'] = pts;
  }

  if (speculativeCount > 6) {
    const pts = Math.min(20, speculativeCount * 2);
    score += pts;
    evidence.push(`Excessive speculation (${speculativeCount} instances) - guesswork over facts`);
    indicators['speculation'] = pts;
  } else if (speculativeCount > 3) {
    const pts = speculativeCount * 3;
    score += pts;
    indicators['speculation'] = pts;
  }

  if (weakSourceCount > 2) {
    const pts = Math.min(30, weakSourceCount * 10);
    score += pts;
    evidence.push(`Relies on weak sources (${weakSourceCount} social/viral) - questionable credibility`);
    indicators['weak_sources'] = pts;
  } else if (weakSourceCount > 0) {
    const pts = weakSourceCount * 12;
    score += pts;
    evidence.push('Cites social media - unvetted information source');
    indicators['weak_sources'] = pts;
  }

  if (hasAnonymous && quotesCount > 2 && !hasNamedSources) {
    score += 28;
    evidence.push('Heavy reliance on anonymous sources without named corroboration');
    indicators['anonymous'] = 28;
  } else if (hasAnonymous && quotesCount > 1) {
    score += 15;
    evidence.push('Uses anonymous sources - transparency lacking');
    indicators['anonymous'] = 15;
  } else if (hasAnonymous) {
    score += 8;
    indicators['anonymous'] = 8;
  }

  if (verifiedCount === 0 && unverifiedCount > 2 && words.length > 150) {
    score += 25;
    evidence.push('No official verification or credible sources - purely speculative reporting');
    indicators['no_verification'] = 25;
  } else if (verifiedCount === 0 && unverifiedCount > 0 && words.length > 100) {
    score += 15;
    evidence.push('Lacks verified sources to substantiate claims');
    indicators['no_verification'] = 15;
  }

  const sourcingRatio = (strongSourceCount + weakSourceCount) > 0 ?
                        weakSourceCount / (strongSourceCount + weakSourceCount) : 0;
  if (sourcingRatio > 0.7 && weakSourceCount > 1) {
    score += 18;
    evidence.push('Predominantly weak sourcing undermines reliability');
    indicators['poor_sourcing_ratio'] = 18;
  } else if (sourcingRatio > 0.5) {
    score += 10;
    indicators['poor_sourcing_ratio'] = 10;
  }

  if (!hasNamedSources && quotesCount > 2) {
    score += 14;
    evidence.push('Quotes lack attribution to specific named individuals');
    indicators['unclear_attribution'] = 14;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Strong sourcing - credible, verified, transparent reporting',
    indicators
  };
}

function analyzeRepresentationBias(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const perspectives = ['government', 'opposition', 'expert', 'analyst', 'citizen', 'activist', 'official', 'critic', 'researcher', 'academic'];
  const counterWords = ['however', 'but', 'although', 'despite', 'yet', 'on the other hand', 'conversely', 'nevertheless', 'while', 'whereas'];
  const exclusiveWords = ['only', 'just', 'merely', 'simply', 'solely', 'exclusively'];
  const absoluteWords = ['always', 'never', 'everyone', 'no one', 'all', 'none', 'every', 'any', 'everything', 'nothing'];

  const viewpoints = perspectives.filter(p => text.includes(p)).length;
  const hasCounterArguments = counterWords.some(w => text.includes(w));
  const exclusiveCount = exclusiveWords.filter(w => text.includes(w)).length;
  const absoluteCount = absoluteWords.filter(w => text.includes(w)).length;

  const govtMentions = (text.match(/government|minister|official|ministry|govt|ruling/g) || []).length;
  const oppositionMentions = (text.match(/opposition|critic|protest|dissent|alternative|challenge/g) || []).length;
  const expertMentions = (text.match(/expert|analyst|researcher|scholar|professor|specialist/g) || []).length;
  const citizenMentions = (text.match(/citizen|resident|people|public|community|locals/g) || []).length;

  const totalMentions = govtMentions + oppositionMentions + expertMentions + citizenMentions;
  const dominantPerspective = Math.max(govtMentions, oppositionMentions, expertMentions, citizenMentions);
  const perspectiveImbalance = totalMentions > 0 ? dominantPerspective / totalMentions : 0;

  const wordCount = words.length;
  const isSubstantial = wordCount > 200;

  if (viewpoints < 2 && isSubstantial) {
    score += 40;
    evidence.push('Single perspective dominates - completely one-sided narrative lacking diverse voices');
    indicators['single_perspective'] = 40;
  } else if (viewpoints < 2 && wordCount > 100) {
    score += 28;
    evidence.push('Limited perspective in article - needs multiple viewpoints');
    indicators['single_perspective'] = 28;
  } else if (viewpoints === 2 && perspectiveImbalance > 0.75) {
    score += 20;
    evidence.push('Two perspectives but heavily skewed toward one view');
    indicators['imbalanced_perspectives'] = 20;
  }

  if (!hasCounterArguments && wordCount > 200) {
    score += 30;
    evidence.push('No counterarguments or alternative views - tunnel vision reporting');
    indicators['no_counterarguments'] = 30;
  } else if (!hasCounterArguments && wordCount > 100) {
    score += 18;
    evidence.push('Missing counterpoints - one-sided analysis');
    indicators['no_counterarguments'] = 18;
  }

  if (exclusiveCount > 4) {
    const pts = Math.min(25, exclusiveCount * 4);
    score += pts;
    evidence.push(`Exclusionary language (${exclusiveCount} instances) marginalizes voices and limits discourse`);
    indicators['exclusionary'] = pts;
  } else if (exclusiveCount > 2) {
    const pts = exclusiveCount * 5;
    score += pts;
    indicators['exclusionary'] = pts;
  }

  if (absoluteCount > 6) {
    const pts = Math.min(20, absoluteCount * 2);
    score += pts;
    evidence.push(`Absolute statements (${absoluteCount}) oversimplify complex issues - reductive thinking`);
    indicators['absolutism'] = pts;
  } else if (absoluteCount > 3) {
    const pts = absoluteCount * 3;
    score += pts;
    evidence.push(`Binary framing (${absoluteCount} absolutes) ignores nuance`);
    indicators['absolutism'] = pts;
  }

  const quotesCount = (text.match(/"/g) || []).length / 2;
  if (govtMentions > 4 && oppositionMentions === 0 && quotesCount > 2) {
    score += 25;
    evidence.push('Only government voices directly quoted - opposition perspective completely absent');
    indicators['one_sided_quotes'] = 25;
  } else if (oppositionMentions > 4 && govtMentions === 0 && quotesCount > 2) {
    score += 25;
    evidence.push('Only opposition/critics quoted - government view ignored');
    indicators['one_sided_quotes'] = 25;
  } else if ((govtMentions > 2 && oppositionMentions === 0) || (oppositionMentions > 2 && govtMentions === 0)) {
    score += 15;
    evidence.push('Imbalanced quote selection favors one side');
    indicators['one_sided_quotes'] = 15;
  }

  if (expertMentions === 0 && wordCount > 250 && totalMentions > 5) {
    score += 18;
    evidence.push('Lacks expert analysis or independent commentary - only partisan views');
    indicators['no_expert_input'] = 18;
  } else if (expertMentions === 0 && wordCount > 150) {
    score += 10;
    indicators['no_expert_input'] = 10;
  }

  if (citizenMentions === 0 && wordCount > 200 && (govtMentions > 3 || oppositionMentions > 3)) {
    score += 12;
    evidence.push('Elite-focused - ignores common citizen perspective');
    indicators['missing_public_voice'] = 12;
  }

  if (perspectiveImbalance > 0.8 && totalMentions > 5) {
    score += 15;
    evidence.push(`One voice dominates ${Math.round(perspectiveImbalance * 100)}% of mentions - echo chamber effect`);
    indicators['perspective_monopoly'] = 15;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Diverse representation - multiple perspectives with balanced coverage',
    indicators
  };
}

function analyzeLanguageBias(text: string, title: string, words: string[], sentences: string[], originalTitle: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const sensationalWords = ['shocking', 'explosive', 'bombshell', 'stunning', 'unprecedented', 'unbelievable', 'mind-blowing', 'jaw-dropping'];
  const clickbaitPhrases = ['you won\'t believe', 'what happened next', 'shocking truth', 'secret revealed', 'exposed', 'this is why'];
  const exaggerations = ['massive', 'huge', 'enormous', 'gigantic', 'tremendous', 'incredible', 'astronomical', 'colossal'];
  const manipulativeWords = ['must-read', 'urgent', 'breaking', 'exclusive', 'revealed', 'exposed', 'leaked'];

  const sensationalCount = sensationalWords.filter(w => title.toLowerCase().includes(w)).length;
  const clickbaitCount = clickbaitPhrases.filter(p => title.toLowerCase().includes(p)).length;
  const exaggerationCount = exaggerations.filter(e => text.includes(e)).length;
  const manipulativeCount = manipulativeWords.filter(m => title.toLowerCase().includes(m)).length;

  if (clickbaitCount > 0) {
    score += 45;
    evidence.push('Clickbait headline - manipulates curiosity, journalistic integrity severely compromised');
    indicators['clickbait'] = 45;
  }

  if (sensationalCount > 1) {
    const pts = Math.min(40, sensationalCount * 18);
    score += pts;
    evidence.push(`Multiple sensational terms in headline (${sensationalCount}) - designed to provoke rather than inform`);
    indicators['sensational'] = pts;
  } else if (sensationalCount > 0) {
    score += 25;
    evidence.push('Sensational headline framing - emotional manipulation over facts');
    indicators['sensational'] = 25;
  }

  if (manipulativeCount > 1) {
    const pts = Math.min(25, manipulativeCount * 12);
    score += pts;
    evidence.push(`Manipulative headline tactics (${manipulativeCount} instances) - artificial urgency`);
    indicators['manipulative'] = pts;
  } else if (manipulativeCount > 0) {
    score += 15;
    indicators['manipulative'] = 15;
  }

  if (exaggerationCount > 6) {
    const pts = Math.min(25, exaggerationCount * 2.5);
    score += pts;
    evidence.push(`Excessive exaggeration (${exaggerationCount} hyperbolic terms) - inflates importance artificially`);
    indicators['exaggeration'] = pts;
  } else if (exaggerationCount > 3) {
    const pts = exaggerationCount * 3;
    score += pts;
    evidence.push(`Exaggerated language (${exaggerationCount} instances)`);
    indicators['exaggeration'] = pts;
  }

  const capsCount = (originalTitle.match(/\b[A-Z]{2,}\b/g) || []).length;
  const exclamationCount = (originalTitle.match(/!/g) || []).length;
  const questionExclamation = originalTitle.includes('?!') || originalTitle.includes('!?');
  const multipleExclamation = /!{2,}/.test(originalTitle);

  if (capsCount > 2 || exclamationCount > 2 || multipleExclamation) {
    score += 28;
    evidence.push('Excessive typography (CAPS/!!!) - manufactured outrage and sensationalism');
    indicators['typography'] = 28;
  } else if (capsCount > 0 || exclamationCount > 1 || questionExclamation) {
    score += 18;
    evidence.push('Typographic emphasis - emotionally manipulative formatting');
    indicators['typography'] = 18;
  } else if (exclamationCount === 1) {
    score += 8;
    indicators['typography'] = 8;
  }

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  if (avgSentenceLength < 7 && sentences.length > 8) {
    score += 15;
    evidence.push('Choppy, fragmented sentences create artificial urgency and breathlessness');
    indicators['fragmented_writing'] = 15;
  } else if (avgSentenceLength < 9 && sentences.length > 5) {
    score += 8;
    indicators['fragmented_writing'] = 8;
  }

  const hasMetrics = /\d+%|\d+ percent|statistics|data|study|research|survey|report/.test(text);
  const strongClaims = /historic|unprecedented|worst|best|first time|never before/.test(text);

  if (!hasMetrics && strongClaims && words.length > 150) {
    score += 18;
    evidence.push('Strong claims without data or evidence to support - assertion without substantiation');
    indicators['unsupported_claims'] = 18;
  } else if (!hasMetrics && (sensationalCount > 0 || exaggerationCount > 2)) {
    score += 12;
    evidence.push('Sensational claims lack factual backing');
    indicators['unsupported_claims'] = 12;
  }

  const colonInTitle = originalTitle.includes(':');
  const dashInTitle = originalTitle.includes(' - ');
  if ((colonInTitle || dashInTitle) && sensationalCount > 0) {
    score += 8;
    evidence.push('Two-part sensational headline - double manipulation tactic');
    indicators['compound_headline'] = 8;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Professional language - neutral, measured, fact-based tone',
    indicators
  };
}

function analyzeSentiment(text: string, title: string, words: string[]): any {
  const positive = ['good', 'great', 'excellent', 'wonderful', 'fantastic', 'success', 'successful', 'achieve', 'achievement', 'progress'];
  const negative = ['bad', 'terrible', 'horrible', 'fail', 'failure', 'crisis', 'problem', 'issue', 'concern', 'decline'];
  const neutral = ['said', 'according', 'reported', 'stated', 'announced'];

  let posCount = 0, negCount = 0, neuCount = 0;

  positive.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) posCount += matches.length;
  });

  negative.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) negCount += matches.length;
  });

  neutral.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) neuCount += matches.length;
  });

  const total = posCount + negCount + 1;
  const score = Math.max(-1, Math.min(1, (posCount - negCount) / total));

  let label: string;
  if (score > 0.35) label = 'positive';
  else if (score < -0.35) label = 'negative';
  else if (Math.abs(posCount - negCount) < 2 && (posCount + negCount) > 3) label = 'mixed';
  else label = 'neutral';

  return {
    score,
    label,
    topics: extractTopics(text),
    entities: extractEntities(text),
    keywords: words.filter(w => w.length > 4).slice(0, 10),
    confidence: Math.min(0.95, (posCount + negCount) / total * 0.8 + 0.2)
  };
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const keywords = {
    'Politics': ['government', 'minister', 'party', 'election'],
    'Economy': ['economy', 'business', 'market', 'financial'],
    'Health': ['health', 'hospital', 'medical', 'doctor'],
    'Education': ['education', 'school', 'university', 'student'],
    'Technology': ['technology', 'digital', 'ai', 'software']
  };

  Object.entries(keywords).forEach(([topic, words]) => {
    if (words.some(k => text.includes(k))) topics.push(topic);
  });

  return topics.slice(0, 5);
}

function extractEntities(text: string): any[] {
  const entities: any[] = [];
  const locations = ['India', 'Delhi', 'Mumbai', 'Bangalore', 'Chennai'];
  locations.forEach(l => {
    if (text.includes(l)) entities.push({ type: 'LOCATION', text: l });
  });
  return entities.slice(0, 10);
}

function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
  return 'English';
}
