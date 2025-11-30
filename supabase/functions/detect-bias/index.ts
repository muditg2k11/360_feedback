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

    // Political Bias Detection
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
    if (overallScore >= 65) classification = 'High Bias';
    else if (overallScore >= 35) classification = 'Medium Bias';

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

  const highBiasTerms = ['alleged', 'claims', 'reportedly', 'purportedly', 'supposedly', 'apparently'];
  const moderateBiasTerms = ['controversial', 'criticized', 'praised', 'slammed', 'blasted', 'defended'];
  const mildBiasTerms = ['said', 'stated', 'announced', 'mentioned', 'noted', 'commented'];

  const textLower = text.toLowerCase();

  highBiasTerms.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 15;
      evidence.push(`Uses speculative term '${term}' ${count} time(s)`);
    }
  });

  moderateBiasTerms.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 8;
      evidence.push(`Contains charged term '${term}' ${count} time(s)`);
    }
  });

  mildBiasTerms.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 2;
    }
  });

  score = Math.min(100, Math.max(0, score));

  const explanation = score > 60
    ? 'High use of speculative and charged political language'
    : score > 30
    ? 'Moderate political framing detected'
    : 'Relatively neutral political language';

  return { score, evidence, explanation };
}

function analyzeRegionalBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const regions = ['delhi', 'mumbai', 'kolkata', 'chennai', 'bangalore', 'hyderabad', 'north', 'south', 'east', 'west'];
  const textLower = text.toLowerCase();

  const regionMentions = regions.filter(r => textLower.includes(r));
  if (regionMentions.length > 0) {
    score = 15 * regionMentions.length;
    evidence.push(`Focuses on specific regions: ${regionMentions.join(', ')}`);
  }

  score = Math.min(100, score);

  const explanation = score > 30
    ? 'Strong regional focus detected'
    : 'Minimal regional bias';

  return { score, evidence, explanation };
}

function analyzeSentimentBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const extremeNegative = ['crisis', 'disaster', 'catastrophe', 'scandal', 'outrage', 'chaos'];
  const strongNegative = ['failure', 'problem', 'issue', 'concern', 'criticism', 'opposition'];
  const moderateNegative = ['difficult', 'challenge', 'setback', 'delay', 'question'];

  const textLower = text.toLowerCase();

  extremeNegative.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 20;
      evidence.push(`Extreme negative term '${term}' used ${count} time(s)`);
    }
  });

  strongNegative.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 10;
      evidence.push(`Strong negative term '${term}' used ${count} time(s)`);
    }
  });

  moderateNegative.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 5;
    }
  });

  score = Math.min(100, score);

  const explanation = score > 60
    ? 'Highly negative sentiment and emotional language'
    : score > 30
    ? 'Moderately negative framing'
    : 'Balanced or neutral sentiment';

  return { score, evidence, explanation };
}

function analyzeSourceReliability(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const unreliableTerms = ['sources say', 'anonymous sources', 'unconfirmed', 'rumored', 'insiders claim'];
  const textLower = text.toLowerCase();

  unreliableTerms.forEach(term => {
    if (textLower.includes(term)) {
      score += 25;
      evidence.push(`Uses unreliable sourcing: '${term}'`);
    }
  });

  if (!textLower.includes('official') && !textLower.includes('confirmed')) {
    score += 10;
  }

  score = Math.min(100, score);

  const explanation = score > 50
    ? 'Heavy reliance on unverified or anonymous sources'
    : score > 25
    ? 'Some source reliability concerns'
    : 'Generally reliable sourcing';

  return { score, evidence, explanation };
}

function analyzeRepresentation(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const oneSidedTerms = ['opponents say', 'critics argue', 'supporters claim'];
  const textLower = text.toLowerCase();

  let perspectiveCount = 0;
  oneSidedTerms.forEach(term => {
    if (textLower.includes(term)) {
      perspectiveCount++;
    }
  });

  if (perspectiveCount <= 1) {
    score = 40;
    evidence.push('Limited perspective diversity');
  } else {
    score = 20;
  }

  const explanation = score > 30
    ? 'Limited representation of diverse viewpoints'
    : 'Multiple perspectives represented';

  return { score, evidence, explanation };
}

function analyzeLanguageBias(text: string): BiasAnalysis {
  const evidence: string[] = [];
  let score = 0;

  const sensationalTerms = ['shocking', 'stunning', 'explosive', 'bombshell', 'massive', 'huge', 'incredible'];
  const clickbaitTerms = ['you won\'t believe', 'this will', 'what happens next', 'shocking truth'];

  const textLower = text.toLowerCase();

  sensationalTerms.forEach(term => {
    const count = (textLower.match(new RegExp(term, 'g')) || []).length;
    if (count > 0) {
      score += count * 15;
      evidence.push(`Sensational language: '${term}'`);
    }
  });

  clickbaitTerms.forEach(term => {
    if (textLower.includes(term)) {
      score += 30;
      evidence.push(`Clickbait phrase: '${term}'`);
    }
  });

  const allCapsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (allCapsWords > 0) {
    score += allCapsWords * 10;
    evidence.push(`${allCapsWords} words in ALL CAPS`);
    }

  score = Math.min(100, score);

  const explanation = score > 60
    ? 'Highly sensational and emotionally charged language'
    : score > 30
    ? 'Moderately sensational framing'
    : 'Professional and measured language';

  return { score, evidence, explanation };
}

function detectLanguage(text: string): string {
  const hindiPattern = /[\u0900-\u097F]/;
  return hindiPattern.test(text) ? 'Hindi' : 'English';
}
