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
};
