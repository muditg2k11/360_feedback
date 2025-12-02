// 12-DIMENSION BIAS DETECTION - COMPLETE REAL-TIME ANALYSIS
// Analyzes: Political, Regional, Sentiment, Source, Representation, Language,
// Factual, Headline, Attribution, Temporal, Omission, Framing
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive bias detection patterns for all 12 dimensions
const biasPatterns = {
  political: {
    left: ['progressive', 'liberal', 'socialist', 'welfare', 'equality', 'redistribution', 'social justice', 'reform'],
    right: ['conservative', 'traditional', 'nationalist', 'free market', 'privatization', 'law and order'],
    keywords: ['government', 'policy', 'election', 'party', 'minister', 'opposition', 'ruling', 'सरकार', 'चुनाव']
  },
  regional: {
    regions: ['delhi', 'mumbai', 'bangalore', 'kolkata', 'chennai', 'hyderabad', 'north india', 'south india', 'northeast', 'दिल्ली', 'मुंबई'],
    bias_words: ['always', 'never', 'only', 'just', 'typical', 'usual', 'all', 'none'],
    stereotypes: ['backward', 'advanced', 'developed', 'underdeveloped', 'modern', 'traditional']
  },
  sentiment: {
    positive: ['success', 'achievement', 'progress', 'excellent', 'outstanding', 'improved', 'growth', 'beneficial', 'सफलता', 'विकास'],
    negative: ['failure', 'crisis', 'problem', 'poor', 'declined', 'worse', 'issue', 'concern', 'criticized', 'संकट', 'समस्या'],
    extreme: ['disaster', 'catastrophe', 'perfect', 'amazing', 'terrible', 'horrible', 'brilliant', 'awful']
  },
  source: {
    credible: ['official', 'confirmed', 'verified', 'according to', 'stated', 'announced', 'पुष्टि'],
    weak: ['reportedly', 'allegedly', 'rumored', 'sources say', 'it is believed', 'कथित'],
    anonymous: ['unnamed source', 'anonymous', 'confidential source', 'insider']
  },
  representation: {
    gender: ['he', 'she', 'his', 'her', 'male', 'female', 'man', 'woman', 'वह', 'उसकी', 'उसका'],
    religious: ['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'हिंदू', 'मुस्लिम'],
    caste: ['brahmin', 'dalit', 'obc', 'general', 'reservation', 'ब्राह्मण', 'दलित'],
    class: ['rich', 'poor', 'elite', 'middle class', 'wealthy', 'अमीर', 'गरीब']
  },
  language: {
    loaded: ['clearly', 'obviously', 'undeniably', 'definitely', 'absolutely', 'स्पष्ट रूप से'],
    extreme: ['always', 'never', 'every', 'all', 'none', 'हमेशा', 'कभी नहीं'],
    emotional: ['shocking', 'outrageous', 'stunning', 'incredible', 'unbelievable', 'चौंकाने वाला']
  },
  factual: {
    facts: ['according to data', 'statistics show', 'research indicates', 'study found', 'आंकड़े', 'अध्ययन'],
    opinions: ['believe', 'think', 'feel', 'opinion', 'view', 'seems', 'appears', 'राय', 'लगता है'],
    speculation: ['could', 'might', 'may', 'possibly', 'perhaps', 'probably', 'शायद', 'संभवतः'],
    unsupported: ['some say', 'many believe', 'it is said', 'कहा जाता है']
  },
  headline: {
    clickbait: ['shocking', 'you wont believe', 'amazing', 'stunning', 'exclusive', 'breaking'],
    question: ['?', 'how', 'why', 'what', 'when', 'where', 'क्या', 'कैसे'],
    sensational: ['crisis', 'disaster', 'explosive', 'bombshell', 'revelation', 'सनसनीखेज'],
    misleading: ['suggests', 'implies', 'hints', 'indicates']
  },
  attribution: {
    direct: ['said', 'stated', 'announced', 'declared', 'confirmed', 'कहा', 'घोषित'],
    indirect: ['according to', 'as per', 'sources say', 'के अनुसार'],
    vague: ['some', 'many', 'several', 'a few', 'others', 'कुछ', 'कई'],
    missing: ['is', 'are', 'was', 'were', 'has', 'have']
  },
  temporal: {
    current: ['today', 'now', 'currently', 'this week', 'recently', 'आज', 'अभी'],
    past: ['yesterday', 'last week', 'previously', 'earlier', 'कल', 'पिछले'],
    vague: ['soon', 'later', 'eventually', 'sometime', 'जल्द ही'],
    urgent: ['immediately', 'urgently', 'now', 'right now', 'तुरंत']
  },
  omission: {
    context_words: ['however', 'but', 'although', 'despite', 'nevertheless', 'लेकिन', 'हालांकि'],
    both_sides: ['on one hand', 'on the other hand', 'alternatively', 'conversely'],
    qualifiers: ['some', 'many', 'most', 'several', 'few'],
    counter_points: ['critics say', 'opponents argue', 'others believe', 'विरोधी']
  },
  framing: {
    war: ['battle', 'fight', 'combat', 'war', 'attack', 'defend', 'युद्ध', 'लड़ाई'],
    sports: ['win', 'lose', 'defeat', 'victory', 'compete', 'जीत', 'हार'],
    drama: ['dramatic', 'tension', 'conflict', 'clash', 'confrontation', 'नाटकीय'],
    economic: ['cost', 'benefit', 'profit', 'loss', 'value', 'लाभ', 'हानि'],
    moral: ['right', 'wrong', 'good', 'bad', 'ethical', 'unethical', 'सही', 'गलत']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { title, content, feedbackId } = body;

    if (!title && !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title or content required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Analyzing 12 dimensions for: ${title}`);

    const text = `${title} ${content || ''}`.toLowerCase();
    const titleLower = title.toLowerCase();

    // ============================================
    // DIMENSION 1: POLITICAL BIAS
    // ============================================
    const politicalBias = analyzePoliticalBias(text);

    // ============================================
    // DIMENSION 2: REGIONAL BIAS
    // ============================================
    const regionalBias = analyzeRegionalBias(text);

    // ============================================
    // DIMENSION 3: SENTIMENT BIAS
    // ============================================
    const sentimentBias = analyzeSentimentBias(text);

    // ============================================
    // DIMENSION 4: SOURCE RELIABILITY
    // ============================================
    const sourceReliability = analyzeSourceReliability(text);

    // ============================================
    // DIMENSION 5: REPRESENTATION BIAS
    // ============================================
    const representationBias = analyzeRepresentationBias(text);

    // ============================================
    // DIMENSION 6: LANGUAGE BIAS
    // ============================================
    const languageBias = analyzeLanguageBias(text);

    // ============================================
    // DIMENSION 7: FACTUAL ACCURACY (NEW)
    // ============================================
    const factualAccuracy = analyzeFactualAccuracy(text);

    // ============================================
    // DIMENSION 8: HEADLINE BIAS (NEW)
    // ============================================
    const headlineBias = analyzeHeadlineBias(titleLower);

    // ============================================
    // DIMENSION 9: ATTRIBUTION BIAS (NEW)
    // ============================================
    const attributionBias = analyzeAttributionBias(text);

    // ============================================
    // DIMENSION 10: TEMPORAL BIAS (NEW)
    // ============================================
    const temporalBias = analyzeTemporalBias(text);

    // ============================================
    // DIMENSION 11: OMISSION BIAS (NEW)
    // ============================================
    const omissionBias = analyzeOmissionBias(text);

    // ============================================
    // DIMENSION 12: FRAMING BIAS (NEW)
    // ============================================
    const framingBias = analyzeFramingBias(text);

    // Calculate overall bias score (weighted average)
    const overallScore = Math.round(
      (politicalBias * 0.12) +
      (regionalBias * 0.08) +
      (sentimentBias * 0.12) +
      (sourceReliability * 0.08) +
      (representationBias * 0.08) +
      (languageBias * 0.08) +
      (factualAccuracy * 0.10) +
      (headlineBias * 0.10) +
      (attributionBias * 0.08) +
      (temporalBias * 0.06) +
      (omissionBias * 0.06) +
      (framingBias * 0.04)
    );

    // Determine classification
    let classification = 'Neutral';
    if (overallScore < 35) classification = 'Low Bias';
    else if (overallScore < 65) classification = 'Medium Bias';
    else classification = 'High Bias';

    // Determine sentiment label
    let sentimentLabel = 'neutral';
    const posCount = countKeywords(text, biasPatterns.sentiment.positive);
    const negCount = countKeywords(text, biasPatterns.sentiment.negative);

    if (posCount > negCount + 2) sentimentLabel = 'positive';
    else if (negCount > posCount + 2) sentimentLabel = 'negative';
    else if (Math.abs(posCount - negCount) <= 1 && (posCount > 0 || negCount > 0)) sentimentLabel = 'mixed';

    const sentimentScore = (posCount - negCount) / Math.max(1, posCount + negCount);

    // Detailed analysis with evidence for ALL 12 dimensions
    const detailedAnalysis = {
      political_bias: {
        score: politicalBias,
        explanation: getPoliticalExplanation(politicalBias),
        evidence: extractEvidence(text, [...biasPatterns.political.left, ...biasPatterns.political.right])
      },
      regional_bias: {
        score: regionalBias,
        explanation: getRegionalExplanation(regionalBias),
        evidence: extractEvidence(text, biasPatterns.regional.regions)
      },
      sentiment_bias: {
        score: sentimentBias,
        explanation: getSentimentExplanation(sentimentBias),
        evidence: extractEvidence(text, [...biasPatterns.sentiment.positive, ...biasPatterns.sentiment.negative, ...biasPatterns.sentiment.extreme])
      },
      source_reliability: {
        score: sourceReliability,
        explanation: getSourceExplanation(sourceReliability),
        evidence: extractEvidence(text, [...biasPatterns.source.credible, ...biasPatterns.source.weak])
      },
      representation_bias: {
        score: representationBias,
        explanation: getRepresentationExplanation(representationBias),
        evidence: extractEvidence(text, [...biasPatterns.representation.religious, ...biasPatterns.representation.caste])
      },
      language_bias: {
        score: languageBias,
        explanation: getLanguageExplanation(languageBias),
        evidence: extractEvidence(text, [...biasPatterns.language.loaded, ...biasPatterns.language.extreme])
      },
      factual_accuracy: {
        score: factualAccuracy,
        explanation: getFactualExplanation(factualAccuracy),
        evidence: extractEvidence(text, [...biasPatterns.factual.opinions, ...biasPatterns.factual.speculation])
      },
      headline_bias: {
        score: headlineBias,
        explanation: getHeadlineExplanation(headlineBias),
        evidence: [titleLower.substring(0, 100)]
      },
      attribution_bias: {
        score: attributionBias,
        explanation: getAttributionExplanation(attributionBias),
        evidence: extractEvidence(text, [...biasPatterns.attribution.vague, ...biasPatterns.attribution.indirect])
      },
      temporal_bias: {
        score: temporalBias,
        explanation: getTemporalExplanation(temporalBias),
        evidence: extractEvidence(text, [...biasPatterns.temporal.vague, ...biasPatterns.temporal.urgent])
      },
      omission_bias: {
        score: omissionBias,
        explanation: getOmissionExplanation(omissionBias),
        evidence: extractEvidence(text, biasPatterns.omission.context_words)
      },
      framing_bias: {
        score: framingBias,
        explanation: getFramingExplanation(framingBias),
        evidence: extractEvidence(text, [...biasPatterns.framing.war, ...biasPatterns.framing.drama])
      }
    };

    // Prepare comprehensive bias indicators
    const biasIndicators = {
      overall_score: overallScore,
      classification: classification,
      political_bias: politicalBias,
      regional_bias: regionalBias,
      sentiment_bias: sentimentBias,
      source_reliability_bias: sourceReliability,
      representation_bias: representationBias,
      language_bias: languageBias,
      factual_accuracy_bias: factualAccuracy,
      headline_content_bias: headlineBias,
      attribution_bias: attributionBias,
      temporal_bias: temporalBias,
      omission_bias: omissionBias,
      framing_bias: framingBias,
      detailed_analysis: detailedAnalysis
    };

    // Update database if feedbackId provided
    if (feedbackId) {
      // Update feedback_items
      const { error: updateError } = await supabaseClient
        .from('feedback_items')
        .update({ status: 'analyzed' })
        .eq('id', feedbackId);

      if (updateError) {
        console.error('Error updating feedback_items:', updateError);
      }

      // Insert or update ai_analyses
      const { data: existingAnalysis } = await supabaseClient
        .from('ai_analyses')
        .select('id')
        .eq('feedback_id', feedbackId)
        .maybeSingle();

      if (existingAnalysis) {
        // Update existing
        await supabaseClient
          .from('ai_analyses')
          .update({
            sentiment_score: sentimentScore,
            sentiment_label: sentimentLabel,
            bias_indicators: biasIndicators,
            language_detected: 'English',
            confidence_score: 0.85
          })
          .eq('id', existingAnalysis.id);
      } else {
        // Insert new
        await supabaseClient
          .from('ai_analyses')
          .insert({
            feedback_id: feedbackId,
            sentiment_score: sentimentScore,
            sentiment_label: sentimentLabel,
            bias_indicators: biasIndicators,
            language_detected: 'English',
            confidence_score: 0.85,
            topics: [],
            entities: [],
            keywords: []
          });
      }

      console.log(`✅ 12-dimension analysis saved for feedback ${feedbackId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          overall_score: overallScore,
          classification: classification,
          sentiment_label: sentimentLabel,
          sentiment_score: sentimentScore,
          dimensions: {
            political_bias: politicalBias,
            regional_bias: regionalBias,
            sentiment_bias: sentimentBias,
            source_reliability_bias: sourceReliability,
            representation_bias: representationBias,
            language_bias: languageBias,
            factual_accuracy_bias: factualAccuracy,
            headline_bias: headlineBias,
            attribution_bias: attributionBias,
            temporal_bias: temporalBias,
            omission_bias: omissionBias,
            framing_bias: framingBias
          },
          detailed_analysis: detailedAnalysis
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 12-dimension bias detection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ============================================
// ANALYSIS FUNCTIONS FOR EACH DIMENSION
// ============================================

function analyzePoliticalBias(text: string): number {
  const leftCount = countKeywords(text, biasPatterns.political.left);
  const rightCount = countKeywords(text, biasPatterns.political.right);
  const politicalCount = countKeywords(text, biasPatterns.political.keywords);

  if (politicalCount === 0) return 25;

  const imbalance = Math.abs(leftCount - rightCount);
  const totalPolitical = leftCount + rightCount + 1;

  return Math.min(100, 25 + (imbalance / totalPolitical) * 75);
}

function analyzeRegionalBias(text: string): number {
  const regionMentions = countKeywords(text, biasPatterns.regional.regions);
  const biasWords = countKeywords(text, biasPatterns.regional.bias_words);
  const stereotypes = countKeywords(text, biasPatterns.regional.stereotypes);

  if (regionMentions === 0) return 15;

  const biasRatio = (biasWords + stereotypes * 2) / (regionMentions + 1);
  return Math.min(100, 15 + biasRatio * 85);
}

function analyzeSentimentBias(text: string): number {
  const posCount = countKeywords(text, biasPatterns.sentiment.positive);
  const negCount = countKeywords(text, biasPatterns.sentiment.negative);
  const extremeCount = countKeywords(text, biasPatterns.sentiment.extreme);

  const total = posCount + negCount + 1;
  const imbalance = Math.abs(posCount - negCount);

  const baseScore = (imbalance / total) * 50;
  const extremeBonus = (extremeCount / total) * 50;

  return Math.min(100, baseScore + extremeBonus);
}

function analyzeSourceReliability(text: string): number {
  const credible = countKeywords(text, biasPatterns.source.credible);
  const weak = countKeywords(text, biasPatterns.source.weak);
  const anonymous = countKeywords(text, biasPatterns.source.anonymous);

  if (credible + weak + anonymous === 0) return 50;

  const reliabilityScore = (credible * 100) / (credible + weak * 2 + anonymous * 3 + 1);
  return Math.min(100, 100 - reliabilityScore);
}

function analyzeRepresentationBias(text: string): number {
  const genderMentions = countKeywords(text, biasPatterns.representation.gender);
  const religiousMentions = countKeywords(text, biasPatterns.representation.religious);
  const casteMentions = countKeywords(text, biasPatterns.representation.caste);
  const classMentions = countKeywords(text, biasPatterns.representation.class);

  const totalMentions = genderMentions + religiousMentions + casteMentions * 2 + classMentions;

  if (totalMentions === 0) return 20;

  return Math.min(100, 20 + (totalMentions * 8));
}

function analyzeLanguageBias(text: string): number {
  const loadedCount = countKeywords(text, biasPatterns.language.loaded);
  const extremeCount = countKeywords(text, biasPatterns.language.extreme);
  const emotionalCount = countKeywords(text, biasPatterns.language.emotional);
  const words = text.split(/\s+/).length;

  if (words === 0) return 0;

  const ratio = (loadedCount + extremeCount * 2 + emotionalCount * 1.5) / words;
  return Math.min(100, ratio * 300);
}

function analyzeFactualAccuracy(text: string): number {
  const facts = countKeywords(text, biasPatterns.factual.facts);
  const opinions = countKeywords(text, biasPatterns.factual.opinions);
  const speculation = countKeywords(text, biasPatterns.factual.speculation);
  const unsupported = countKeywords(text, biasPatterns.factual.unsupported);

  const total = facts + opinions + speculation + unsupported + 1;

  const biasScore = ((opinions + speculation * 1.5 + unsupported * 2) / total) * 100;
  return Math.min(100, biasScore);
}

function analyzeHeadlineBias(headline: string): number {
  const clickbaitCount = countKeywords(headline, biasPatterns.headline.clickbait);
  const questionCount = headline.includes('?') ? 1 : 0;
  const sensationalCount = countKeywords(headline, biasPatterns.headline.sensational);
  const misleadingCount = countKeywords(headline, biasPatterns.headline.misleading);

  const biasScore = (clickbaitCount * 25) + (questionCount * 15) + (sensationalCount * 30) + (misleadingCount * 20);
  return Math.min(100, biasScore);
}

function analyzeAttributionBias(text: string): number {
  const direct = countKeywords(text, biasPatterns.attribution.direct);
  const indirect = countKeywords(text, biasPatterns.attribution.indirect);
  const vague = countKeywords(text, biasPatterns.attribution.vague);

  if (direct + indirect + vague === 0) return 60;

  const attributionScore = (vague * 100) / (direct + indirect * 0.5 + vague + 1);
  return Math.min(100, attributionScore);
}

function analyzeTemporalBias(text: string): number {
  const current = countKeywords(text, biasPatterns.temporal.current);
  const past = countKeywords(text, biasPatterns.temporal.past);
  const vague = countKeywords(text, biasPatterns.temporal.vague);
  const urgent = countKeywords(text, biasPatterns.temporal.urgent);

  if (current + past + vague + urgent === 0) return 30;

  const biasScore = ((vague * 2 + urgent * 1.5) / (current + past + vague + urgent + 1)) * 100;
  return Math.min(100, biasScore);
}

function analyzeOmissionBias(text: string): number {
  const contextWords = countKeywords(text, biasPatterns.omission.context_words);
  const bothSides = countKeywords(text, biasPatterns.omission.both_sides);
  const qualifiers = countKeywords(text, biasPatterns.omission.qualifiers);
  const counterPoints = countKeywords(text, biasPatterns.omission.counter_points);

  const balanceScore = contextWords + bothSides * 2 + qualifiers + counterPoints * 2;
  const words = text.split(/\s+/).length;

  if (words === 0) return 50;

  const balanceRatio = balanceScore / (words / 50);
  return Math.min(100, Math.max(0, 100 - (balanceRatio * 50)));
}

function analyzeFramingBias(text: string): number {
  const war = countKeywords(text, biasPatterns.framing.war);
  const sports = countKeywords(text, biasPatterns.framing.sports);
  const drama = countKeywords(text, biasPatterns.framing.drama);
  const economic = countKeywords(text, biasPatterns.framing.economic);
  const moral = countKeywords(text, biasPatterns.framing.moral);

  const totalFraming = war * 2 + sports + drama * 1.5 + economic * 0.5 + moral * 1.5;
  const words = text.split(/\s+/).length;

  if (words === 0) return 0;

  const framingRatio = totalFraming / (words / 100);
  return Math.min(100, framingRatio * 50);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function extractEvidence(text: string, keywords: string[]): string[] {
  const evidence: string[] = [];
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.length < 20) continue;

    for (const keyword of keywords) {
      if (s.toLowerCase().includes(keyword.toLowerCase())) {
        evidence.push(s.substring(0, 120) + (s.length > 120 ? '...' : ''));
        break;
      }
    }
    if (evidence.length >= 3) break;
  }

  return evidence;
}

// ============================================
// EXPLANATION FUNCTIONS
// ============================================

function getPoliticalExplanation(score: number): string {
  if (score < 35) return 'Minimal political bias. Content appears balanced across political spectrum.';
  if (score < 65) return 'Moderate political lean detected. Some partisan language or selective emphasis present.';
  return 'Strong political bias. Content shows clear partisan alignment or political agenda.';
}

function getRegionalExplanation(score: number): string {
  if (score < 35) return 'Low regional bias. Content fairly represents different regions without stereotyping.';
  if (score < 65) return 'Moderate regional bias. Some regional stereotyping or geographic prejudice present.';
  return 'High regional bias. Content shows strong regional prejudice or unfair characterization of regions.';
}

function getSentimentExplanation(score: number): string {
  if (score < 35) return 'Balanced sentiment. Mix of positive and negative language with neutral tone.';
  if (score < 65) return 'Noticeable sentiment bias. Content leans positive or negative with emotional language.';
  return 'Extreme sentiment bias. Highly emotional, one-sided language with strong opinions.';
}

function getSourceExplanation(score: number): string {
  if (score < 35) return 'Strong attribution. Content properly cites credible, verifiable sources.';
  if (score < 65) return 'Moderate source issues. Some reliance on weak sources or vague attribution.';
  return 'Weak sourcing. Heavy reliance on anonymous sources, rumors, or unverified claims.';
}

function getRepresentationExplanation(score: number): string {
  if (score < 35) return 'Fair representation. Balanced coverage without overemphasizing identity groups.';
  if (score < 65) return 'Some representation issues. Certain groups overemphasized or stereotyped.';
  return 'Significant representation bias. Disproportionate focus on identity with stereotyping.';
}

function getLanguageExplanation(score: number): string {
  if (score < 35) return 'Neutral language. Factual, objective tone without loaded terminology.';
  if (score < 65) return 'Somewhat loaded language. Some emotional or persuasive terms used.';
  return 'Highly loaded language. Extensive use of extreme, emotional, or manipulative terms.';
}

function getFactualExplanation(score: number): string {
  if (score < 35) return 'High factual accuracy. Content primarily based on facts, data, and evidence.';
  if (score < 65) return 'Mixed factual accuracy. Some opinions presented as facts or unverified claims.';
  return 'Low factual accuracy. Heavy reliance on speculation, opinions, or unsupported assertions.';
}

function getHeadlineExplanation(score: number): string {
  if (score < 35) return 'Neutral headline. Accurate, informative, without sensationalism or clickbait.';
  if (score < 65) return 'Somewhat sensational headline. Uses attention-grabbing language or questions.';
  return 'Highly biased headline. Uses clickbait, sensationalism, or misleading framing.';
}

function getAttributionExplanation(score: number): string {
  if (score < 35) return 'Strong attribution. Clear, direct sourcing with named individuals or organizations.';
  if (score < 65) return 'Moderate attribution issues. Some vague sources or indirect attribution.';
  return 'Weak attribution. Heavy use of vague sources, "some say," or missing attribution.';
}

function getTemporalExplanation(score: number): string {
  if (score < 35) return 'Clear temporal framing. Specific dates, times, and timelines provided.';
  if (score < 65) return 'Moderate temporal bias. Some vague timing or artificial urgency.';
  return 'Significant temporal bias. Vague timing, artificial urgency, or misleading temporal context.';
}

function getOmissionExplanation(score: number): string {
  if (score < 35) return 'Balanced coverage. Presents multiple perspectives with proper context.';
  if (score < 65) return 'Some omission bias. Missing important context or alternative viewpoints.';
  return 'Significant omission bias. One-sided coverage, missing crucial context or counter-arguments.';
}

function getFramingExplanation(score: number): string {
  if (score < 35) return 'Neutral framing. Factual presentation without imposing narrative frameworks.';
  if (score < 65) return 'Moderate framing bias. Uses metaphors or frameworks that shape interpretation.';
  return 'Strong framing bias. Heavy use of war, sports, or drama metaphors that bias understanding.';
}
