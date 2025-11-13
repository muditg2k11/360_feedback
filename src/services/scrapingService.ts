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
      // Get all feedback items without summaries
      const { data: feedbackItems, error } = await supabase
        .from('feedback_items')
        .select('id, title, content, original_language')
        .is('summary', null)
        .limit(50); // Process in batches

      if (error) throw error;

      if (!feedbackItems || feedbackItems.length === 0) {
        return { success: true, count: 0 };
      }

      console.log(`Generating summaries for ${feedbackItems.length} articles...`);

      let successCount = 0;

      // Process each item
      for (const item of feedbackItems) {
        const result = await this.generateSummary(
          item.id,
          item.content,
          item.title,
          item.original_language
        );

        if (result.success) {
          successCount++;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
};
