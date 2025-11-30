import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  feedbackId: string;
  type?: 'negative_story' | 'high_bias' | 'manual';
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

    const { feedbackId, type = 'manual' }: NotificationRequest = await req.json();

    const { data: article, error: articleError } = await supabase
      .from('feedback_items')
      .select(`
        *,
        source:media_sources(*),
        analysis:ai_analyses(*),
        department:government_departments(*)
      `)
      .eq('id', feedbackId)
      .maybeSingle();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({ success: false, error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!article.primary_department_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No department assigned to this article'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: officers, error: officersError } = await supabase
      .from('pib_officers')
      .select(`
        *,
        preferences:notification_preferences(*)
      `)
      .eq('department_id', article.primary_department_id)
      .eq('is_active', true);

    if (officersError || !officers || officers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No officers found for this department',
          notifications_sent: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const sentimentScore = article.analysis?.sentiment_score || 0;
    const biasScore = article.analysis?.bias_indicators?.overall_score || 0;

    for (const officer of officers) {
      const pref = officer.preferences?.[0];

      if (!pref || !pref.enabled) continue;

      const meetsThreshold = sentimentScore < (pref.sentiment_threshold || -0.3) ||
                            biasScore > (pref.bias_threshold || 60);

      if (meetsThreshold) {
        const message = `🚨 ALERT: ${type.toUpperCase()}\n\n` +
          `Dept: ${article.department?.short_name || 'Unknown'}\n` +
          `Source: ${article.source?.name || 'Unknown'}\n` +
          `Language: ${article.detected_language || article.original_language}\n\n` +
          `Headline: ${article.title}\n\n` +
          `Sentiment: ${(sentimentScore * 100).toFixed(0)}%\n` +
          `Bias: ${biasScore}/100\n\n` +
          `View: ${Deno.env.get('APP_URL') || 'http://localhost:5173'}/feedback/${feedbackId}`;

        for (const channel of pref.notification_channels || ['email']) {
          try {
            let sent = false;

            if (channel === 'email' && officer.email) {
              await logNotification(supabase, officer.id, feedbackId, 'email', 'sent');
              sent = true;
            }

            if (channel === 'sms' && officer.phone_number) {
              await logNotification(supabase, officer.id, feedbackId, 'sms', 'pending',
                'SMS integration pending - requires Twilio setup');
              sent = true;
            }

            if (channel === 'push') {
              await logNotification(supabase, officer.id, feedbackId, 'push', 'pending',
                'Push notification integration pending - requires Firebase setup');
              sent = true;
            }

            if (sent) {
              results.push({
                officer: officer.full_name,
                email: officer.email,
                channel,
                status: 'logged'
              });
            }
          } catch (error) {
            await logNotification(supabase, officer.id, feedbackId, channel, 'failed',
              error.message);
            results.push({
              officer: officer.full_name,
              channel,
              status: 'failed',
              error: error.message
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: results.length,
        results,
        note: 'SMS and Push notifications require external service integration'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logNotification(
  supabase: any,
  officerId: string,
  feedbackId: string,
  channel: string,
  status: string,
  errorMessage?: string
) {
  await supabase.from('notification_log').insert({
    officer_id: officerId,
    feedback_id: feedbackId,
    channel,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    error_message: errorMessage
  });
}
