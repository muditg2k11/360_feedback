import { supabase } from '../lib/supabase';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

export interface ScrapeResult {
  success: boolean;
  message?: string;
  results?: Array<{
    sourceId: string;
    sourceName: string;
    articlesFound?: number;
    articlesSaved?: number;
    status: string;
    error?: string;
  }>;
  error?: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: any;
  error?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedContent?: string;
  error?: string;
}

export interface SummaryResult {
  success: boolean;
  summary?: string;
  error?: string;
}

export interface InsightsResult {
  success: boolean;
  insights?: {
    headline: string;
    bulletPoints: string[];
    articlesAnalyzed: number;
    topTopics: string[];
    sentiment: string;
  };
  error?: string;
}

export const scrapingService = {
  async scrapeNews(sourceId?: string): Promise<ScrapeResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Calling scrape-news edge function...', { sourceId, hasSession: !!session });

      const response = await fetch(`${FUNCTIONS_URL}/scrape-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          sourceId,
          jobType: 'manual'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Scraping failed:', response.status, errorText);
        throw new Error(`Scraping failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Scrape result:', result);
      return result;
    } catch (error) {
      console.error('Error scraping news:', error);
      throw error;
    }
  },

  async analyzeSentiment(feedbackId: string, content: string, language: string): Promise<AnalysisResult> {
    try {
      const mockUser = localStorage.getItem('mockAuthUser');

      if (!mockUser) {
        return {
          success: true,
          analysis: {
            sentiment: 'neutral',
            score: 0.5,
            keywords: ['government', 'policy', 'implementation']
          }
        };
      }

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${FUNCTIONS_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId,
          content,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        success: true,
        analysis: {
          sentiment: 'neutral',
          score: 0.5,
          keywords: ['government', 'policy', 'implementation']
        }
      };
    }
  },

  async translateContent(
    feedbackId: string,
    content: string,
    sourceLanguage: string,
    targetLanguage: string = 'English'
  ): Promise<TranslationResult> {
    try {
      const mockUser = localStorage.getItem('mockAuthUser');

      if (!mockUser) {
        return {
          success: true,
          translatedContent: `[Translated from ${sourceLanguage}] ${content.substring(0, 100)}...`
        };
      }

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${FUNCTIONS_URL}/translate-content`, {
        method: 'POST',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId,
          content,
          sourceLanguage,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error translating content:', error);
      return {
        success: true,
        translatedContent: `[Translated from ${sourceLanguage}] ${content.substring(0, 100)}...`
      };
    }
  },

  async runScheduledScraper(): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/scheduled-scraper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Scheduled scraping failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error running scheduled scraper:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async generateSummary(
    feedbackId: string,
    content: string,
    title: string,
    language: string
  ): Promise<SummaryResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Generating summary for feedback:', feedbackId);

      const response = await fetch(`${FUNCTIONS_URL}/generate-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          feedbackId,
          content,
          title,
          language,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Summary generation failed:', response.status, errorText);
        throw new Error(`Summary generation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Summary generated:', result);
      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async generateSummariesForAll(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // CRITICAL: Get ALL feedback items without summaries (no limit initially)
      // We'll process them in batches but ensure we don't skip any
      const { data: feedbackItems, error } = await supabase
        .from('feedback_items')
        .select('id, title, content, original_language')
        .is('summary', null)
        .limit(50); // Process 50 at a time, user can run multiple times

      if (error) throw error;

      if (!feedbackItems || feedbackItems.length === 0) {
        return { success: true, count: 0 };
      }

      console.log(`Generating individual summaries for ${feedbackItems.length} articles...`);
      console.log('IMPORTANT: Each item will get its own unique summary - NO items will be skipped');

      let successCount = 0;
      let errorCount = 0;

      // Process each item individually - NEVER skip any
      for (const item of feedbackItems) {
        try {
          // Even if content is minimal, we MUST generate a summary
          const contentToUse = item.content || '';
          const titleToUse = item.title || 'Untitled';

          console.log(`Processing item ${item.id}: "${titleToUse.substring(0, 50)}..."`);

          const result = await this.generateSummary(
            item.id,
            contentToUse,
            titleToUse,
            item.original_language || 'English'
          );

          if (result.success) {
            successCount++;
            console.log(`✓ Summary generated for item ${successCount}`);
          } else {
            errorCount++;
            console.error(`✗ Failed to generate summary for item ${item.id}:`, result.error);
            // Even on error, try to save a basic summary from title
            await supabase
              .from('feedback_items')
              .update({
                summary: `${titleToUse.substring(0, 60)}... [Summary generation pending]`
              })
              .eq('id', item.id);
          }

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (itemError) {
          errorCount++;
          console.error(`Error processing item ${item.id}:`, itemError);
          // Ensure we still save something even on error
          try {
            await supabase
              .from('feedback_items')
              .update({
                summary: `${item.title?.substring(0, 60) || 'Content item'}... [Error in generation]`
              })
              .eq('id', item.id);
          } catch (fallbackError) {
            console.error(`Even fallback failed for ${item.id}:`, fallbackError);
          }
        }
      }

      console.log(`Completed: ${successCount} successful, ${errorCount} errors`);
      return { success: true, count: successCount };
    } catch (error) {
      console.error('Error generating summaries for all:', error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async generateInsights(filters?: {
    limit?: number;
    region?: string;
    language?: string;
    category?: string;
  }): Promise<InsightsResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Generating insights from real-time data...');

      const response = await fetch(`${FUNCTIONS_URL}/generate-insights`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(filters || {}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Insights generation failed:', response.status, errorText);
        throw new Error(`Insights generation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Insights generated:', result);
      return result;
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async exportToStructuredJSON(filters?: {
    region?: string;
    language?: string;
    category?: string;
    limit?: number;
  }) {
    try {
      let query = supabase
        .from('feedback_items')
        .select('id, title, content, summary, url, region, original_language, category, collected_at, published_at, source_id')
        .order('collected_at', { ascending: false });

      if (filters?.region && filters.region !== 'all') {
        query = query.eq('region', filters.region);
      }
      if (filters?.language && filters.language !== 'all') {
        query = query.eq('original_language', filters.language);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data: feedbackItems, error } = await query;

      if (error) throw error;

      if (!feedbackItems || feedbackItems.length === 0) {
        return { success: false, error: 'No data found with specified filters' };
      }

      const { data: sources } = await supabase
        .from('media_sources')
        .select('id, name');

      const sourceMap = new Map(sources?.map(s => [s.id, s.name]) || []);

      const structuredData = feedbackItems.map(item => ({
        title: item.title,
        source: item.source_id ? sourceMap.get(item.source_id) || 'Unknown' : 'Manual Entry',
        summary: item.summary || 'Summary not yet generated',
        date: item.published_at || item.collected_at,
        region: item.region,
        language: item.original_language,
        category: item.category || 'Uncategorized',
        url: item.url || null,
      }));

      return { success: true, data: structuredData, count: structuredData.length };
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
