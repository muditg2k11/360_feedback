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

    console.log('Starting scheduled scraping job...');

    const scrapeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-news`;
    const scrapeResponse = await fetch(scrapeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobType: 'scheduled' }),
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.status}`);
    }

    const scrapeResult = await scrapeResponse.json();
    console.log('Scraping completed:', scrapeResult);

    const { data: pendingItems, error: fetchError } = await supabase
      .from('feedback_items')
      .select('id, content, original_language')
      .eq('status', 'processing')
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingItems?.length || 0} items to process`);

    const translateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/translate-content`;
    const analyzeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-sentiment`;

    for (const item of pendingItems || []) {
      try {
        if (item.original_language !== 'English') {
          await fetch(translateUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              feedbackId: item.id,
              content: item.content,
              sourceLanguage: item.original_language,
            }),
          });
        }

        await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedbackId: item.id,
            content: item.content,
            language: item.original_language,
          }),
        });

        console.log(`Processed item ${item.id}`);
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled scraping and analysis completed',
        scrapeResult,
        processedItems: pendingItems?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scheduled-scraper:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
