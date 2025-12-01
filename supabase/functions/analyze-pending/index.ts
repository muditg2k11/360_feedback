import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { batchSize = 20 } = await req.json().catch(() => ({ batchSize: 20 }));
    const maxBatchSize = Math.min(batchSize, 20);

    console.log(`Starting analysis of pending articles (batch size: ${maxBatchSize})...`);

    const { data: pendingArticles, error: fetchError } = await supabase
      .from('feedback_items')
      .select('id, title, content')
      .eq('status', 'processing')
      .limit(maxBatchSize);

    if (fetchError) {
      throw new Error(`Error fetching pending articles: ${fetchError.message}`);
    }

    if (!pendingArticles || pendingArticles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending articles to analyze',
          analyzed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${pendingArticles.length} pending articles`);

    let analyzedCount = 0;
    let failedCount = 0;

    const analyzePromises = pendingArticles.map(async (article) => {
      try {
        const detectBiasUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/detect-bias`;
        const response = await fetch(detectBiasUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: article.title,
            content: article.content,
            feedbackId: article.id,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          console.log(`✓ Analyzed: ${article.title.substring(0, 50)}...`);
          return { success: true };
        } else {
          console.error(`✗ Failed to analyze: ${article.title.substring(0, 50)}...`);
          return { success: false };
        }
      } catch (analyzeError) {
        console.error('Error analyzing article:', article.title.substring(0, 50), analyzeError);
        return { success: false };
      }
    });

    const results = await Promise.allSettled(analyzePromises);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        analyzedCount++;
      } else {
        failedCount++;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analysis complete`,
        total: pendingArticles.length,
        analyzed: analyzedCount,
        failed: failedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-pending:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});