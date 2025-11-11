import { supabase } from '../lib/supabase';
import { fallbackDataService } from './fallbackDataService';
import {
  MediaSource,
  FeedbackItem,
  AIAnalysis,
  DashboardStats,
  PerformanceMetrics,
  Report,
} from '../types';

export const dataService = {
  async getMediaSources(): Promise<MediaSource[]> {
    try {
      console.log('Fetching media sources from Supabase...');
      const { data, error } = await supabase
        .from('media_sources')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching media sources:', error);
        throw error;
      }
      console.log(`Successfully fetched ${data?.length || 0} media sources`);
      return data || [];
    } catch (error) {
      console.warn('Using fallback storage for media sources', error);
      const fallbackData = await fallbackDataService.getMediaSources();
      console.log(`Fallback returned ${fallbackData.length} media sources`);
      return fallbackData;
    }
  },

  async getFeedbackItems(limit?: number): Promise<FeedbackItem[]> {
    try {
      console.log('Fetching feedback items from Supabase...');
      let query = supabase
        .from('feedback_items')
        .select('*')
        .order('collected_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch feedback items:', error);
        throw error;
      }
      console.log(`Successfully fetched ${data?.length || 0} feedback items`);
      return data || [];
    } catch (error) {
      console.warn('Using fallback storage for feedback items', error);
      const fallbackData = await fallbackDataService.getFeedbackItems();
      console.log(`Fallback returned ${fallbackData.length} feedback items`);
      return fallbackData;
    }
  },

  async getFeedbackItemById(id: string): Promise<FeedbackItem | null> {
    const { data, error } = await supabase
      .from('feedback_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch feedback item:', error);
      return null;
    }
    return data;
  },

  async getAnalysisByFeedbackId(feedbackId: string): Promise<AIAnalysis | null> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('feedback_id', feedbackId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch analysis:', error);
      return null;
    }
    return data;
  },

  async getAllAnalyses(): Promise<AIAnalysis[]> {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch analyses:', error);
      return [];
    }
    return data || [];
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const [feedbackItems, analyses] = await Promise.all([
      this.getFeedbackItems(),
      this.getAllAnalyses(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analyzedToday = analyses.filter(
      (a) => new Date(a.processed_at) >= today
    ).length;

    const avgSentiment =
      analyses.reduce((sum, a) => sum + a.sentiment_score, 0) / analyses.length || 0;

    const biasDetected = analyses.filter(
      (a) =>
        (a.bias_indicators as any)?.political_bias > 0.5 ||
        (a.bias_indicators as any)?.regional_bias > 0.5
    ).length;

    const sentimentDistribution = {
      positive: analyses.filter((a) => a.sentiment_label === 'positive').length,
      negative: analyses.filter((a) => a.sentiment_label === 'negative').length,
      neutral: analyses.filter((a) => a.sentiment_label === 'neutral').length,
      mixed: analyses.filter((a) => a.sentiment_label === 'mixed').length,
    };

    const regionalCounts = new Map<string, { count: number; sentimentSum: number }>();
    feedbackItems.forEach((item) => {
      const current = regionalCounts.get(item.region) || { count: 0, sentimentSum: 0 };
      const analysis = analyses.find((a) => a.feedback_id === item.id);
      regionalCounts.set(item.region, {
        count: current.count + 1,
        sentimentSum: current.sentimentSum + (analysis?.sentiment_score || 0),
      });
    });

    const regionalDistribution = Array.from(regionalCounts.entries())
      .map(([region, data]) => ({
        region,
        count: data.count,
        sentiment: data.count > 0 ? data.sentimentSum / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topicCounts = new Map<string, { count: number; sentimentSum: number }>();
    analyses.forEach((analysis) => {
      analysis.topics.forEach((topic) => {
        const current = topicCounts.get(topic) || { count: 0, sentimentSum: 0 };
        topicCounts.set(topic, {
          count: current.count + 1,
          sentimentSum: current.sentimentSum + analysis.sentiment_score,
        });
      });
    });

    const trendingTopics = Array.from(topicCounts.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        sentiment: data.count > 0 ? data.sentimentSum / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const languageCounts = new Map<string, number>();
    feedbackItems.forEach((item) => {
      const current = languageCounts.get(item.original_language) || 0;
      languageCounts.set(item.original_language, current + 1);
    });

    const languageDistribution = Array.from(languageCounts.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalFeedback: feedbackItems.length,
      analyzedToday,
      avgSentiment,
      biasDetected,
      sentimentDistribution,
      regionalDistribution,
      trendingTopics,
      languageDistribution,
    };
  },

  async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .order('period_start', { ascending: false });

    if (error) {
      console.error('Failed to fetch performance metrics:', error);
      return [];
    }
    return data || [];
  },

  async getReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch reports:', error);
      return [];
    }
    return data || [];
  },

  async createMediaSource(source: Omit<MediaSource, 'id' | 'created_at' | 'updated_at'>): Promise<MediaSource | null> {
    try {
      const { data, error } = await supabase
        .from('media_sources')
        .insert(source)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Using fallback storage for creating media source');
      return fallbackDataService.createMediaSource(source);
    }
  },

  async updateMediaSource(id: string, updates: Partial<MediaSource>): Promise<MediaSource | null> {
    try {
      const { data, error } = await supabase
        .from('media_sources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Using fallback storage for updating media source');
      return fallbackDataService.updateMediaSource(id, updates);
    }
  },

  async deleteMediaSource(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('media_sources').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('Using fallback storage for deleting media source');
      await fallbackDataService.deleteMediaSource(id);
      return true;
    }
  },

  subscribeToFeedbackItems(callback: (payload: any) => void) {
    try {
      return supabase
        .channel('feedback_items_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feedback_items' },
          callback
        )
        .subscribe();
    } catch (error) {
      console.warn('Failed to subscribe to feedback items:', error);
      return { unsubscribe: () => {} };
    }
  },

  subscribeToAnalyses(callback: (payload: any) => void) {
    try {
      return supabase
        .channel('analyses_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ai_analyses' },
          callback
        )
        .subscribe();
    } catch (error) {
      console.warn('Failed to subscribe to analyses:', error);
      return { unsubscribe: () => {} };
    }
  },
};
