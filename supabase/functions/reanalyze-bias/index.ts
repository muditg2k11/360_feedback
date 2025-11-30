import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: articles } = await supabase
      .from('feedback_items')
      .select('id, title, content')
      .not('content', 'is', null)
      .limit(500);

    const results = { total: articles?.length || 0, processed: 0, low: 0, medium: 0, high: 0 };

    for (const article of articles || []) {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/detect-bias`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: article.title, content: article.content, feedbackId: article.id })
      });

      if (response.ok) {
        const result = await response.json();
        results.processed++;
        const score = result.analysis?.overall_score || 0;
        if (score < 35) results.low++;
        else if (score < 65) results.medium++;
        else results.high++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
