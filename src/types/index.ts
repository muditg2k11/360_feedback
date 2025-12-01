export type UserRole = 'admin' | 'analyst' | 'government_official' | 'viewer';

export type MediaType = 'newspaper' | 'tv' | 'radio' | 'social_media' | 'online' | 'magazine' | 'youtube';

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';

export type BiasType = 'regional' | 'political' | 'language' | 'source' | 'cultural' | 'none';

export type BiasLevel = 'high' | 'medium' | 'low' | 'none';

export type FeedbackStatus = 'pending' | 'processing' | 'analyzed' | 'validated' | 'archived';

export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'adhoc';

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'volatile';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  designation?: string;
  region?: string;
  avatar_url?: string;
}

export interface MediaSource {
  id: string;
  name: string;
  type: MediaType;
  language: string;
  region: string;
  url?: string;
  credibility_score: number;
  active: boolean;
  created_at: string;
  youtube_channel_id?: string;
  platform_type?: 'news' | 'youtube';
  video_count?: number;
}

export interface FeedbackItem {
  id: string;
  source_id?: string;
  source?: MediaSource;
  title: string;
  content: string;
  summary?: string;
  original_language: string;
  translated_content?: string;
  url?: string;
  published_at?: string;
  collected_at: string;
  region: string;
  category?: string;
  status: FeedbackStatus;
}

export interface AIAnalysis {
  id: string;
  feedback_id: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  topics: string[];
  entities: Array<{ text: string; type: string }>;
  keywords: string[];
  language_detected: string;
  confidence_score: number;
  bias_indicators: Record<string, any>;
  processed_at: string;
}

export interface BiasValidation {
  id: string;
  analysis_id: string;
  validator_id: string;
  bias_type: BiasType;
  bias_level: BiasLevel;
  validation_notes?: string;
  validated_at: string;
  status: string;
}

export interface PerformanceMetrics {
  id: string;
  period_start: string;
  period_end: string;
  department?: string;
  region?: string;
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  mixed_count: number;
  avg_sentiment: number;
  top_topics: Array<{ topic: string; count: number }>;
  top_entities: Array<{ entity: string; count: number }>;
  trend_direction: TrendDirection;
}

export interface Report {
  id: string;
  title: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  departments: string[];
  regions: string[];
  summary: string;
  insights: Array<{ title: string; description: string }>;
  recommendations: Array<{ priority: string; recommendation: string }>;
  created_by: string;
  created_at: string;
  status: string;
}

export interface DashboardStats {
  totalFeedback: number;
  analyzedToday: number;
  avgSentiment: number;
  biasDetected: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  regionalDistribution: Array<{ region: string; count: number; sentiment: number }>;
  trendingTopics: Array<{ topic: string; count: number; sentiment: number }>;
  languageDistribution: Array<{ language: string; count: number }>;
}

export interface YouTubeVideo {
  id: string;
  video_id: string;
  channel_id: string;
  channel_name: string;
  title: string;
  description: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  thumbnail_url: string;
  duration: string;
  transcript?: string;
  sentiment_score?: number;
  sentiment_label?: SentimentLabel;
  department_id?: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface YouTubeComment {
  id: string;
  video_id: string;
  comment_id: string;
  author_name: string;
  text: string;
  like_count: number;
  published_at: string;
  created_at: string;
}
