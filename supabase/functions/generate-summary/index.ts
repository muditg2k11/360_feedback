import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SummaryRequest {
  feedbackId?: string;
  content: string;
  title: string;
  language: string;
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

    const { feedbackId, content, title, language }: SummaryRequest = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Generating insightful summary for:', title.substring(0, 50));

    const summary = generateContentBasedSummary(content || '', title, language);

    console.log('Generated summary:', summary);

    if (feedbackId) {
      const { error: updateError } = await supabase
        .from('feedback_items')
        .update({ summary })
        .eq('id', feedbackId);

      if (updateError) {
        console.error('Error updating summary:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateContentBasedSummary(content: string, title: string, language: string): string {
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  const cleanTitle = title.replace(/\s+/g, ' ').trim();

  if (!cleanContent || cleanContent.length < 20) {
    return generateInsightFromTitle(cleanTitle);
  }

  const insights = extractKeyInsights(cleanContent, cleanTitle);
  const summary = buildInsightfulSummary(insights, cleanContent, cleanTitle);

  return summary;
}

function generateInsightFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  let insight = '';

  if (titleLower.includes('announce') || titleLower.includes('launch') || titleLower.includes('घोषणा')) {
    insight = `This announcement signals a new policy initiative. ${title} The move indicates government focus on this sector and aims to create positive impact through targeted implementation.`;
  }
  else if (titleLower.includes('metro') || titleLower.includes('road') || titleLower.includes('infrastructure')) {
    insight = `${title} This infrastructure development aims to improve connectivity and economic growth. The project will benefit local communities through enhanced transportation and regional development opportunities.`;
  }
  else if (titleLower.includes('exam') || titleLower.includes('admission') || titleLower.includes('education')) {
    insight = `${title} This educational development affects students and academic institutions. It reflects efforts to improve accessibility, standardize processes, and enhance learning opportunities for beneficiaries.`;
  }
  else if (titleLower.includes('farmer') || titleLower.includes('crop') || titleLower.includes('agriculture')) {
    insight = `${title} This agricultural initiative targets rural welfare and farming sector improvements. The measure aims to support farmers' livelihoods, boost productivity, and ensure sustainable growth.`;
  }
  else if (titleLower.includes('health') || titleLower.includes('hospital') || titleLower.includes('medical')) {
    insight = `${title} This healthcare initiative aims to improve medical services and public health infrastructure. The development addresses accessibility concerns and quality of care for citizens.`;
  }
  else if (titleLower.includes('budget') || titleLower.includes('crore') || titleLower.includes('economic')) {
    insight = `${title} This financial development has significant economic implications for the region. The allocation reflects government priorities, fiscal planning, and commitment to sectoral growth.`;
  }
  else {
    insight = `${title} This development is significant for the region and reflects current policy priorities. Further implementation details will provide context on timeline, impact, and beneficiary reach.`;
  }

  const words = insight.split(/\s+/);
  if (words.length > 60) {
    return words.slice(0, 60).join(' ') + '...';
  }
  return insight;
}

function extractKeyInsights(content: string, title: string): any {
  const insights = {
    amounts: [] as string[],
    locations: [] as string[],
    officials: [] as string[],
    dates: [] as string[],
    beneficiaries: [] as string[]
  };

  const numberMatches = content.match(/\d+\s*(?:crore|lakh|billion|million|thousand|करोड़|लाख)/gi);
  if (numberMatches) insights.amounts = numberMatches.slice(0, 2);

  const locationPattern = /(?:karnataka|tamil nadu|telangana|kerala|maharashtra|delhi|mumbai|bangalore|chennai|hyderabad|pune|bengaluru)/gi;
  const locationMatches = content.match(locationPattern);
  if (locationMatches) insights.locations = [...new Set(locationMatches)].slice(0, 2);

  const officialPattern = /(?:minister|chief minister|cm|prime minister|pm|secretary|governor|मंत्री)\s+\w+/gi;
  const officialMatches = content.match(officialPattern);
  if (officialMatches) insights.officials = [...new Set(officialMatches)].slice(0, 2);

  const datePattern = /(?:\d{4}|\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)|next year|by \d{4})/gi;
  const dateMatches = content.match(datePattern);
  if (dateMatches) insights.dates = [...new Set(dateMatches)].slice(0, 2);

  const beneficiaryPattern = /(?:\d+\s+(?:million|lakh|thousand|crore)\s+(?:people|citizens|farmers|students|patients|families|beneficiaries))/gi;
  const beneficiaryMatches = content.match(beneficiaryPattern);
  if (beneficiaryMatches) insights.beneficiaries = beneficiaryMatches.slice(0, 1);

  return insights;
}

function buildInsightfulSummary(insights: any, content: string, title: string): string {
  const sentences: string[] = [];
  let currentWords = 0;
  const maxWords = 60;

  const mainAction = extractMainAction(content, title);
  if (mainAction) {
    sentences.push(mainAction);
    currentWords += mainAction.split(/\s+/).length;
  }

  if (currentWords < 50) {
    const details = buildDetailsFromInsights(insights);
    if (details) {
      sentences.push(details);
      currentWords += details.split(/\s+/).length;
    }
  }

  if (currentWords < 45) {
    const impact = extractImpact(content, title, insights);
    if (impact) {
      sentences.push(impact);
      currentWords += impact.split(/\s+/).length;
    }
  }

  if (currentWords < 50 && insights.beneficiaries.length > 0) {
    sentences.push(`This will benefit ${insights.beneficiaries[0]}.`);
  }

  let summary = sentences.join(' ');

  const words = summary.split(/\s+/);
  if (words.length > maxWords) {
    summary = words.slice(0, maxWords).join(' ') + '...';
  }

  if (!summary || summary.length < 30) {
    return extractTopSentencesWithContext(content, title);
  }

  return summary;
}

function extractMainAction(content: string, title: string): string {
  const actionPatterns = [
    /(?:announced|launched|introduced|inaugurated|started|implemented|expanded)\s+[^.!?।॥]{20,100}/i,
    /(?:will|plans to|aims to|proposes to|seeks to)\s+[^.!?।॥]{20,100}/i,
    /(?:government|minister|chief minister|state)\s+[^.!?।॥]{20,100}[.!?।॥]/i
  ];

  for (const pattern of actionPatterns) {
    const match = content.match(pattern);
    if (match) {
      let sentence = match[0].trim();
      sentence = sentence.replace(/[.!?।॥]+$/, '') + '.';
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
  }

  return title + ' marks a significant policy development in the sector.';
}

function buildDetailsFromInsights(insights: any): string {
  const details: string[] = [];

  if (insights.amounts.length > 0) {
    details.push(`involving ${insights.amounts[0]}`);
  }

  if (insights.locations.length > 0) {
    details.push(`in ${insights.locations.join(' and ')}`);
  }

  if (insights.dates.length > 0) {
    details.push(`with target timeline of ${insights.dates[0]}`);
  }

  if (details.length === 0) return '';

  return 'The initiative, ' + details.join(', ') + ', demonstrates strategic planning.';
}

function extractImpact(content: string, title: string, insights: any): string {
  const contentLower = content.toLowerCase();

  const impactPatterns = [
    /(?:will benefit|aims to|expected to|designed to|help|improve|enhance|boost)\s+[^.!?।॥]{20,80}/i,
    /(?:impact|effect|create|enable|facilitate|strengthen)\s+[^.!?।॥]{20,80}/i
  ];

  for (const pattern of impactPatterns) {
    const match = content.match(pattern);
    if (match) {
      let sentence = match[0].trim();
      sentence = sentence.replace(/[.!?।॥]+$/, '') + '.';
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
  }

  if (contentLower.includes('infrastructure') || contentLower.includes('metro') || contentLower.includes('road')) {
    return 'This infrastructure push will improve connectivity, reduce travel time, and stimulate regional economic growth.';
  }
  if (contentLower.includes('education') || contentLower.includes('student') || contentLower.includes('exam')) {
    return 'The measure aims to enhance educational opportunities, improve access, and standardize learning outcomes for students.';
  }
  if (contentLower.includes('farmer') || contentLower.includes('agriculture') || contentLower.includes('crop')) {
    return 'This initiative is expected to boost agricultural productivity, increase farmer incomes, and ensure food security.';
  }
  if (contentLower.includes('health') || contentLower.includes('hospital') || contentLower.includes('medical')) {
    return 'The development will enhance healthcare accessibility, improve quality of medical services, and benefit public health outcomes.';
  }

  return 'This strategic move is expected to create positive socio-economic outcomes and benefit local communities.';
}

function extractTopSentencesWithContext(content: string, title: string): string {
  const sentenceDelimiters = /[.!?।॥]+\s+/;
  const sentences = content.split(sentenceDelimiters)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 3);

  const combined = sentences.join('. ');
  const words = combined.split(/\s+/);

  if (words.length <= 60) {
    return combined + '.';
  }

  return words.slice(0, 60).join(' ') + '...';
}
