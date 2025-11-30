import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CategorizationRequest {
  feedbackId: string;
  title: string;
  content: string;
}

interface DepartmentMatch {
  id: string;
  name: string;
  short_name: string;
  score: number;
  matched_keywords: string[];
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

    const { feedbackId, title, content }: CategorizationRequest = await req.json();

    if (!feedbackId || !title) {
      return new Response(
        JSON.stringify({ success: false, error: 'feedbackId and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullText = `${title} ${content || ''}`.toLowerCase();

    const { data: departments, error: deptError } = await supabase
      .from('government_departments')
      .select('*');

    if (deptError || !departments) {
      console.error('Error fetching departments:', deptError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch departments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matches: DepartmentMatch[] = [];

    for (const dept of departments) {
      const matchedKeywords: string[] = [];
      let score = 0;

      for (const keyword of dept.keywords) {
        const keywordLower = keyword.toLowerCase();

        if (fullText.includes(keywordLower)) {
          matchedKeywords.push(keyword);

          if (title.toLowerCase().includes(keywordLower)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }

      if (matchedKeywords.length > 0) {
        matches.push({
          id: dept.id,
          name: dept.name,
          short_name: dept.short_name,
          score,
          matched_keywords: matchedKeywords
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    const primaryDept = matches[0]?.id || null;
    const relatedDepts = matches.slice(0, 3).map(m => m.id);

    const { error: updateError } = await supabase
      .from('feedback_items')
      .update({
        primary_department_id: primaryDept,
        related_departments: relatedDepts
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback item:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        primary: matches[0] || null,
        related: matches.slice(1, 3),
        total_matches: matches.length,
        categorized: primaryDept !== null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Categorization error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
