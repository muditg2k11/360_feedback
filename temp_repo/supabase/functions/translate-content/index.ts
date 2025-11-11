import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TranslationRequest {
  feedbackId: string;
  content: string;
  sourceLanguage: string;
  targetLanguage?: string;
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

    const { feedbackId, content, sourceLanguage, targetLanguage = 'English' }: TranslationRequest = await req.json();

    if (!feedbackId || !content || !sourceLanguage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (sourceLanguage === targetLanguage || sourceLanguage === 'English') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          translatedContent: content,
          message: 'Content is already in target language'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const translatedContent = await translateText(content, sourceLanguage, targetLanguage);

    const { error: updateError } = await supabase
      .from('feedback_items')
      .update({ translated_content: translatedContent })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating translated content:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        translatedContent,
        sourceLanguage,
        targetLanguage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in translate-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const languageMap: Record<string, string> = {
    'Hindi': 'hi',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Bengali': 'bn',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Punjabi': 'pa',
    'Odia': 'or',
    'English': 'en',
  };

  const sourceLangCode = languageMap[sourceLanguage] || 'auto';
  const targetLangCode = languageMap[targetLanguage] || 'en';

  try {
    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLangCode}&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      const translatedText = data[0]
        .map((item: any) => item[0])
        .join('');
      return translatedText;
    }
    
    return text;
  } catch (error) {
    console.error('Translation error, returning original:', error);
    return `[Translation unavailable] ${text}`;
  }
}
