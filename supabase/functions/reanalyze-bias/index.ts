import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    console.log('Starting reanalysis of all articles...');

    const { data: feedbackItems, error: fetchError } = await supabase
      .from('feedback_items')
      .select('id, title, content')
      .eq('status', 'analyzed')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    if (!feedbackItems || feedbackItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No articles to reanalyze', processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${feedbackItems.length} articles to reanalyze`);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of feedbackItems) {
      try {
        console.log(`Reanalyzing article ${item.id}: ${item.title?.substring(0, 50)}...`);

        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/detect-bias`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          },
          body: JSON.stringify({
            title: item.title || '',
            content: item.content || '',
            feedbackId: item.id,
          }),
        });

        const responseText = await response.text();

        if (response.ok) {
          processed++;
          console.log(` Processed ${processed}/${feedbackItems.length}`);
        } else {
          failed++;
          const errorMsg = `Failed to process article ${item.id}: ${response.status} - ${responseText}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }

        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (itemError) {
        failed++;
        const errorMsg = `Error processing article ${item.id}: ${itemError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Reanalysis complete: ${processed} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reanalyzed ${processed} articles`,
        processed,
        failed,
        total: feedbackItems.length,
        errors: errors.slice(0, 5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in reanalyze-bias:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
