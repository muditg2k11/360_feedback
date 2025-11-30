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
    const words = lowerText.split(/\s+/);
    const sentences = fullText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);

    const politicalBias = analyzePoliticalBias(lowerText, lowerTitle, words, sentences);
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

function analyzePoliticalBias(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const proGovt = ['announces', 'launches', 'inaugurates', 'achievement', 'success', 'progress', 'milestone', 'historic', 'breakthrough'];
  const antiGovt = ['fails', 'failure', 'criticism', 'protest', 'controversy', 'scandal', 'corruption', 'condemn', 'blunder'];
  const parties = ['bjp', 'congress', 'aap', 'tmc', 'left', 'right-wing'];
  const leaders = ['modi', 'gandhi', 'kejriwal', 'mamata', 'yogi'];
  const opinions = ['must', 'should', 'ought to', 'need to', 'obviously', 'clearly'];

  let proCount = 0, antiCount = 0;

  proGovt.forEach(term => {
    const count = (text.match(new RegExp(term, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(term, 'g')) || []).length;
    proCount += count + (titleCount * 2.5);
  });

  antiGovt.forEach(term => {
    const count = (text.match(new RegExp(term, 'g')) || []).length;
    const titleCount = (title.match(new RegExp(term, 'g')) || []).length;
    antiCount += count + (titleCount * 2.5);
  });

  const total = proCount + antiCount;
  const imbalance = total > 0 ? Math.abs(proCount - antiCount) / total : 0;

  if (total > 5) {
    const pts = Math.min(35, total * 3);
    score += pts;
    evidence.push(`Strong ${proCount > antiCount ? 'pro' : 'anti'}-govt language (${Math.round(total)} instances)`);
    indicators['political_language'] = pts;
  }

  if (imbalance > 0.6 && total > 3) {
    const pts = Math.min(25, imbalance * 40);
    score += pts;
    evidence.push(`${Math.round(imbalance * 100)}% political imbalance`);
    indicators['imbalance'] = pts;
  }

  const polarizing = parties.filter(p => text.includes(p)).length + leaders.filter(l => text.includes(l)).length;
  if (polarizing > 3) {
    const pts = Math.min(20, polarizing * 4);
    score += pts;
    evidence.push(`${polarizing} partisan references`);
    indicators['partisan'] = pts;
  }

  const opinionCount = opinions.filter(o => text.includes(o)).length;
  if (opinionCount > 2) {
    const pts = Math.min(15, opinionCount * 3);
    score += pts;
    evidence.push(`${opinionCount} prescriptive statements`);
    indicators['prescriptive'] = pts;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Balanced political reporting',
    indicators
  };
}

function analyzeRegionalBias(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const states = ['delhi', 'mumbai', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'gujarat', 'bihar', 'kerala', 'punjab'];
  const urban = ['urban', 'city', 'metro', 'metropolitan'];
  const rural = ['rural', 'village', 'countryside', 'farmers'];

  const stateCount = states.filter(s => text.includes(s)).length;
  const urbanCount = urban.filter(u => text.includes(u)).length;
  const ruralCount = rural.filter(r => text.includes(r)).length;

  if (stateCount > 4) {
    const pts = Math.min(25, stateCount * 3);
    score += pts;
    evidence.push(`${stateCount} states mentioned - narrow focus`);
    indicators['geographic_concentration'] = pts;
  }

  if ((urbanCount > 2 && ruralCount === 0) || (ruralCount > 2 && urbanCount === 0)) {
    const pts = Math.min(30, Math.abs(urbanCount - ruralCount) * 5);
    score += pts;
    evidence.push(`${urbanCount > ruralCount ? 'Urban' : 'Rural'}-centric bias`);
    indicators['urban_rural_imbalance'] = pts;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Balanced regional coverage',
    indicators
  };
}

function analyzeSentimentBias(text: string, title: string, words: string[], sentences: string[], originalTitle: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const strongNeg = ['crisis', 'disaster', 'catastrophe', 'collapse', 'chaos', 'nightmare', 'devastating', 'horrific'];
  const strongPos = ['excellent', 'outstanding', 'perfect', 'magnificent', 'brilliant', 'spectacular'];
  const emotional = ['outrage', 'fury', 'shock', 'horror', 'devastation', 'ecstatic'];

  const negCount = strongNeg.filter(w => text.includes(w)).length;
  const posCount = strongPos.filter(w => text.includes(w)).length;
  const emotCount = emotional.filter(w => text.includes(w)).length;

  if (negCount > 2 || posCount > 2) {
    const intensity = Math.max(negCount, posCount);
    const pts = Math.min(35, intensity * 7);
    score += pts;
    evidence.push(`${intensity} charged ${negCount > posCount ? 'negative' : 'positive'} terms`);
    indicators['charged'] = pts;
  }

  if (emotCount > 2) {
    const pts = Math.min(25, emotCount * 5);
    score += pts;
    evidence.push(`${emotCount} emotional terms`);
    indicators['emotional'] = pts;
  }

  if (strongNeg.some(w => originalTitle.toLowerCase().includes(w))) {
    score += 15;
    evidence.push('Emotional headline');
    indicators['headline'] = 15;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Neutral sentiment',
    indicators
  };
}

function analyzeSourceReliability(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const unverified = ['allegedly', 'reportedly', 'sources say', 'rumor', 'claims'];
  const weak = ['social media', 'twitter', 'facebook', 'viral'];

  const unverCount = unverified.filter(t => text.includes(t)).length;
  const weakCount = weak.filter(s => text.includes(s)).length;
  const anonymous = text.includes('anonymous') || text.includes('unnamed');

  if (unverCount > 3) {
    const pts = Math.min(30, unverCount * 5);
    score += pts;
    evidence.push(`${unverCount} unverified claims`);
    indicators['unverified'] = pts;
  }

  if (weakCount > 2) {
    const pts = Math.min(25, weakCount * 7);
    score += pts;
    evidence.push(`${weakCount} weak sources`);
    indicators['weak_sources'] = pts;
  }

  if (anonymous) {
    score += 25;
    evidence.push('Anonymous sources');
    indicators['anonymous'] = 25;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Strong sourcing',
    indicators
  };
}

function analyzeRepresentationBias(text: string, title: string, words: string[], sentences: string[]): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const perspectives = ['government', 'opposition', 'expert', 'citizen', 'activist'];
  const viewpoints = perspectives.filter(p => text.includes(p)).length;
  const hasCounter = ['however', 'but', 'although'].some(w => text.includes(w));

  if (viewpoints < 2 && words.length > 150) {
    score += 35;
    evidence.push('Single perspective');
    indicators['single_view'] = 35;
  }

  if (!hasCounter && words.length > 150) {
    score += 25;
    evidence.push('No counterarguments');
    indicators['no_counter'] = 25;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Diverse perspectives',
    indicators
  };
}

function analyzeLanguageBias(text: string, title: string, words: string[], sentences: string[], originalTitle: string): BiasScore {
  let score = 0;
  const evidence: string[] = [];
  const indicators: { [key: string]: number } = {};

  const sensational = ['shocking', 'explosive', 'bombshell', 'stunning', 'unprecedented'];
  const clickbait = ['you won\'t believe', 'what happened next', 'shocking truth'];

  const sensCount = sensational.filter(w => title.toLowerCase().includes(w)).length;
  const clickCount = clickbait.filter(p => title.toLowerCase().includes(p)).length;

  if (sensCount > 0) {
    const pts = Math.min(35, sensCount * 15);
    score += pts;
    evidence.push(`${sensCount} sensational terms in headline`);
    indicators['sensational'] = pts;
  }

  if (clickCount > 0) {
    score += 40;
    evidence.push('Clickbait headline');
    indicators['clickbait'] = 40;
  }

  if (originalTitle.includes('!') || originalTitle.includes('?!')) {
    score += 15;
    evidence.push('Excessive punctuation');
    indicators['punctuation'] = 15;
  }

  return {
    score: Math.min(100, Math.round(score)),
    evidence,
    explanation: evidence.length > 0 ? evidence.join('; ') : 'Professional language',
    indicators
  };
}

function analyzeSentiment(text: string, title: string, words: string[]): any {
  const positive = ['good', 'great', 'excellent', 'success', 'win', 'progress', 'improve', 'benefit', 'positive', 'achieve'];
  const negative = ['bad', 'fail', 'crisis', 'problem', 'issue', 'concern', 'decline', 'loss', 'negative', 'threat'];

  let posCount = 0, negCount = 0;

  positive.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) posCount += matches.length;
  });

  negative.forEach(word => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) negCount += matches.length;
  });

  const total = posCount + negCount + 1;
  const score = Math.max(-1, Math.min(1, (posCount - negCount) / total));

  let label: string;
  if (score > 0.3) label = 'positive';
  else if (score < -0.3) label = 'negative';
  else label = 'neutral';

  const topics = extractTopics(text);
  const entities = extractEntities(text);
  const keywords = words.filter(w => w.length > 3).slice(0, 10);
  const confidence = Math.min(0.95, (posCount + negCount) / total);

  return { score, label, topics, entities, keywords, confidence };
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
