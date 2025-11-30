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

    console.log('Starting analysis of pending articles...');

    // Get all articles in processing state without analysis
    const { data: pendingArticles, error: fetchError } = await supabase
      .from('feedback_items')
      .select('id, title, content')
      .eq('status', 'processing')
      .limit(100);

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

    // Analyze each article
    for (const article of pendingArticles) {
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
        });

        if (response.ok) {
          analyzedCount++;
          console.log(`✓ Analyzed (${analyzedCount}/${pendingArticles.length}): ${article.title.substring(0, 50)}...`);
        } else {
          failedCount++;
          console.error(`✗ Failed to analyze: ${article.title.substring(0, 50)}...`);
        }
      } catch (analyzeError) {
        failedCount++;
        console.error('Error analyzing article:', analyzeError);
      }

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

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
