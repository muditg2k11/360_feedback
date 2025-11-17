import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { DOMParser } from 'npm:linkedom@0.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScrapeRequest {
  sourceId?: string;
  jobType?: string;
}

interface NewsArticle {
  title: string;
  content: string;
  url: string;
  published_at?: Date;
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

    const { sourceId, jobType = 'manual' }: ScrapeRequest = await req.json();

    console.log('Starting scrape job', { sourceId, jobType });

    let sourcesToScrape = [];

    if (sourceId) {
      const { data: source, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('id', sourceId)
        .maybeSingle();

      if (error || !source) {
        return new Response(
          JSON.stringify({ success: false, error: 'Source not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      sourcesToScrape = [source];
    } else {
      const { data: sources, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('active', true)
        .not('rss_feed', 'is', null)
        .order('language', { ascending: true });

      if (error) {
        throw error;
      }
      sourcesToScrape = sources || [];
      console.log(`Found ${sourcesToScrape.length} active sources with RSS feeds`);
    }

    if (sourcesToScrape.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active sources with RSS feeds found'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const source of sourcesToScrape) {
      const jobId = crypto.randomUUID();

      const { error: jobError } = await supabase
        .from('scraping_jobs')
        .insert({
          id: jobId,
          source_id: source.id,
          job_type: jobType,
          status: 'running',
          started_at: new Date().toISOString(),
        });

      if (jobError) {
        console.error('Error creating job:', jobError);
        continue;
      }

      try {
        const articles = await scrapeRSSFeed(source);

        let savedCount = 0;
        for (const article of articles) {
          const { data: existing } = await supabase
            .from('feedback_items')
            .select('id')
            .eq('url', article.url)
            .maybeSingle();

          if (existing) {
            console.log(`Article already exists: ${article.title}`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('feedback_items')
            .insert({
              source_id: source.id,
              title: article.title,
              content: article.content,
              url: article.url,
              original_language: source.language,
              region: source.region,
              status: 'processing',
              collected_at: new Date().toISOString(),
              published_at: article.published_at?.toISOString(),
            });

          if (!insertError) {
            savedCount++;
          } else {
            console.error('Error inserting article:', insertError);
          }
        }

        await supabase
          .from('scraping_jobs')
          .update({
            status: 'completed',
            articles_found: articles.length,
            articles_saved: savedCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          language: source.language,
          articlesFound: articles.length,
          articlesSaved: savedCount,
          status: 'success',
        });
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          language: source.language,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped ${sourcesToScrape.length} sources`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scrape-news:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scrapeRSSFeed(source: any): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS feed from ${source.name} (${source.language}): ${source.rss_feed}`);
    const response = await fetch(source.rss_feed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Charset': 'UTF-8',
        'Accept-Language': 'en,hi,kn,ta,te,ml,mr,bn,gu,pa,or,as',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const items = doc.querySelectorAll('item');
    const articles: NewsArticle[] = [];

    console.log(`Found ${items.length} items in ${source.language} RSS feed from ${source.name}`);

    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];

      const titleEl = item.querySelector('title');
      const descEl = item.querySelector('description');
      const linkEl = item.querySelector('link');
      const pubDateEl = item.querySelector('pubDate');
      const contentEl = item.querySelector('content\\:encoded') || item.querySelector('content');

      if (!titleEl || !linkEl) continue;

      const title = titleEl.textContent?.trim() || '';
      const url = linkEl.textContent?.trim() || '';
      const pubDateStr = pubDateEl?.textContent?.trim();
      const published_at = pubDateStr ? new Date(pubDateStr) : new Date();

      let content = '';

      if (contentEl && contentEl.textContent) {
        content = contentEl.textContent.trim();
      } else if (descEl && descEl.textContent) {
        content = descEl.textContent.trim();
      }

      content = content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/gi, ' ').trim();

      if (!content || content.length < 100) {
        console.log(`Content too short (${content.length} chars), fetching full article from URL: ${url}`);
        const fetchedContent = await fetchArticleContent(url);
        if (fetchedContent && fetchedContent.length > content.length) {
          console.log(`Successfully extracted ${fetchedContent.length} chars from article page`);
          content = fetchedContent;
        }
      }

      if (!content || content.length < 50) {
        content = title;
      }

      if (content.length > 2000) {
        content = content.substring(0, 2000);
      }

      if (title && url) {
        articles.push({
          title,
          content,
          url,
          published_at,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error scraping RSS feed for ${source.name}:`, error);
    throw error;
  }
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en,hi,kn,ta,te,ml,mr,bn,gu,pa,or,as',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch article: ${response.status}`);
      return '';
    }

    const html = await response.text();
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, 'text/html');

    let content = extractArticleContent(htmlDoc);

    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    return content;
  } catch (error) {
    console.error(`Error fetching article content from ${url}:`, error);
    return '';
  }
}

function extractArticleContent(doc: Document): string {
  const contentSelectors = [
    'article',
    '[itemprop="articleBody"]',
    '.article-content',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.content-body',
    '.story-content',
    '.article__body',
    'main article',
    '.main-content article',
    '#article-body',
    '.news-content',
    '.detail-content',
    'div[class*="article"]',
    'div[class*="story"]',
    'div[class*="content"]',
  ];

  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const paragraphs = element.querySelectorAll('p');
      if (paragraphs.length > 2) {
        const text = Array.from(paragraphs)
          .map(p => p.textContent?.trim())
          .filter(text => text && text.length > 30)
          .join(' ');

        if (text.length > 200) {
          return text;
        }
      }
    }
  }

  const allParagraphs = doc.querySelectorAll('p');
  const mainContent = Array.from(allParagraphs)
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 50)
    .slice(0, 10)
    .join(' ');

  return mainContent;
}
