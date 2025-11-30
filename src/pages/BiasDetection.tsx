import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertTriangle,
  TrendingUp,
  Filter,
  Search,
  Eye,
  BarChart3,
  MapPin,
  Calendar,
  ExternalLink,
  Sparkles,
  Target,
  Award,
  X,
  TrendingDown,
  Activity
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  title: string;
  content: string;
  url: string;
  collected_at: string;
  region: string;
  status: string;
  source: {
    name: string;
    language: string;
  };
  analysis: {
    overall_score: number;
    classification: string;
    sentiment_label: string;
    sentiment_score: number;
    political_bias: number;
    regional_bias: number;
    sentiment_bias: number;
    source_reliability_bias: number;
    representation_bias: number;
    language_bias: number;
    detailed_analysis: any;
  };
}

export default function BiasDetection() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [filterBias, setFilterBias] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    loadBiasData();

    const subscription = supabase
      .channel('bias_updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feedback_items' },
        () => {
          loadBiasData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadBiasData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('feedback_items')
        .select(`
          id,
          title,
          content,
          url,
          collected_at,
          region,
          status,
          media_sources (name, language),
          ai_analyses (
            sentiment_score,
            sentiment_label,
            bias_indicators
          )
        `)
        .order('collected_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const formattedItems = data?.map((item: any) => {
        const biasIndicators = item.ai_analyses?.[0]?.bias_indicators || {};
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          url: item.url,
          collected_at: item.collected_at,
          region: item.region || 'India',
          status: item.status,
          source: {
            name: item.media_sources?.name || 'Unknown',
            language: item.media_sources?.language || 'English'
          },
          analysis: {
            overall_score: biasIndicators.overall_score || 0,
            classification: biasIndicators.classification || 'Unknown',
            sentiment_label: item.ai_analyses?.[0]?.sentiment_label || 'neutral',
            sentiment_score: item.ai_analyses?.[0]?.sentiment_score || 0,
            political_bias: biasIndicators.political_bias || 0,
            regional_bias: biasIndicators.regional_bias || 0,
            sentiment_bias: biasIndicators.sentiment_bias || 0,
            source_reliability_bias: biasIndicators.source_reliability_bias || 0,
            representation_bias: biasIndicators.representation_bias || 0,
            language_bias: biasIndicators.language_bias || 0,
            detailed_analysis: biasIndicators.detailed_analysis || {}
          }
        };
      }) || [];

      setItems(formattedItems);
    } catch (error) {
      console.error('Error loading bias data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzePendingArticles = async () => {
    setAnalyzing(true);
    try {
      const { data: pendingArticles } = await supabase
        .from('feedback_items')
        .select('id, title, content')
        .eq('status', 'processing')
        .limit(50);

      if (!pendingArticles || pendingArticles.length === 0) {
        alert('✅ No pending articles to analyze!');
        setAnalyzing(false);
        return;
      }

      let processed = 0;
      for (const article of pendingArticles) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-bias`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: article.title,
                content: article.content || article.title,
                feedbackId: article.id
              })
            }
          );

          if (response.ok) {
            processed++;
          }
        } catch (err) {
          console.error(`Failed to analyze ${article.id}:`, err);
        }
      }

      alert(`✅ Successfully analyzed ${processed} articles!`);
      await loadBiasData();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getBiasColor = (score: number) => {
    if (score < 35) return 'from-green-500 to-emerald-500';
    if (score < 65) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getBiasLabel = (score: number) => {
    if (score < 35) return { text: 'Low Bias', color: 'text-green-700', bg: 'bg-green-100', icon: '✓' };
    if (score < 65) return { text: 'Medium Bias', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⚠' };
    return { text: 'High Bias', color: 'text-red-700', bg: 'bg-red-100', icon: '⚠⚠' };
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return { bg: 'bg-green-100', text: 'text-green-800', icon: '😊', gradient: 'from-green-400 to-emerald-500' };
      case 'negative': return { bg: 'bg-red-100', text: 'text-red-800', icon: '😔', gradient: 'from-red-400 to-pink-500' };
      case 'mixed': return { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🤔', gradient: 'from-purple-400 to-indigo-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '😐', gradient: 'from-gray-400 to-gray-500' };
    }
  };

  const filteredAndSortedItems = items
    .filter(item => {
      if (filterBias !== 'all') {
        if (filterBias === 'low' && item.analysis.overall_score >= 35) return false;
        if (filterBias === 'medium' && (item.analysis.overall_score < 35 || item.analysis.overall_score >= 65)) return false;
        if (filterBias === 'high' && item.analysis.overall_score < 65) return false;
      }

      if (filterSentiment !== 'all' && item.analysis.sentiment_label.toLowerCase() !== filterSentiment) {
        return false;
      }

      if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime();
      if (sortBy === 'bias') return b.analysis.overall_score - a.analysis.overall_score;
      return 0;
    });

  const BiasBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{Math.round(score)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 bg-gradient-to-r ${color} rounded-full transition-all duration-500 shadow-sm`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
          <p className="mt-4 text-gray-600 font-medium">Loading bias detection data...</p>
        </div>
      </div>
    );
  }

  const lowBiasCount = items.filter(i => i.analysis.overall_score < 35).length;
  const mediumBiasCount = items.filter(i => i.analysis.overall_score >= 35 && i.analysis.overall_score < 65).length;
  const highBiasCount = items.filter(i => i.analysis.overall_score >= 65).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold flex items-center gap-3">
            <Target className="w-12 h-12" />
            AI Bias Detection
          </h1>
          <p className="mt-3 text-lg text-blue-100">
            Advanced real-time analysis of {items.length} articles with dynamic bias scoring
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-semibold text-gray-500">TOTAL</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{items.length}</p>
            <p className="text-sm text-gray-600 mt-1">Articles Analyzed</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">✓</span>
              </div>
              <span className="text-sm font-semibold text-gray-500">LOW</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{lowBiasCount}</p>
            <p className="text-sm text-gray-600 mt-1">
              {items.length > 0 ? Math.round((lowBiasCount / items.length) * 100) : 0}% Low Bias
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <span className="text-sm font-semibold text-gray-500">MEDIUM</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{mediumBiasCount}</p>
            <p className="text-sm text-gray-600 mt-1">
              {items.length > 0 ? Math.round((mediumBiasCount / items.length) * 100) : 0}% Medium Bias
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <span className="text-sm font-semibold text-gray-500">HIGH</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{highBiasCount}</p>
            <p className="text-sm text-gray-600 mt-1">
              {items.length > 0 ? Math.round((highBiasCount / items.length) * 100) : 0}% High Bias
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={filterBias}
                onChange={(e) => setFilterBias(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="all">All Bias Levels</option>
                <option value="low">Low Bias (0-34)</option>
                <option value="medium">Medium Bias (35-64)</option>
                <option value="high">High Bias (65-100)</option>
              </select>

              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
                <option value="mixed">Mixed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="date">Sort by Date</option>
                <option value="bias">Sort by Bias Score</option>
              </select>

              <button
                onClick={analyzePendingArticles}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analyzing...' : 'Analyze Pending'}
              </button>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredAndSortedItems.map((item) => {
            const biasLabel = getBiasLabel(item.analysis.overall_score);
            const sentimentStyle = getSentimentColor(item.analysis.sentiment_label);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {/* Header with Bias Score */}
                <div className={`bg-gradient-to-r ${getBiasColor(item.analysis.overall_score)} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold line-clamp-2 mb-2">{item.title}</h3>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-medium">
                          {item.source.name}
                        </span>
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.region}
                        </span>
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                          {item.source.language}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 text-center min-w-[80px]">
                      <div className="text-3xl font-bold">{Math.round(item.analysis.overall_score)}</div>
                      <div className="text-xs font-medium mt-1 opacity-90">BIAS</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold bg-white ${biasLabel.color} flex items-center gap-1`}>
                      <span>{biasLabel.icon}</span>
                      {biasLabel.text}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${sentimentStyle.bg} ${sentimentStyle.text} flex items-center gap-1`}>
                      <span>{sentimentStyle.icon}</span>
                      {item.analysis.sentiment_label}
                    </span>
                  </div>
                </div>

                {/* Bias Breakdown */}
                <div className="p-6 space-y-4">
                  <BiasBar
                    label="Political Bias"
                    score={item.analysis.political_bias}
                    color="from-blue-500 to-indigo-500"
                  />
                  <BiasBar
                    label="Regional Bias"
                    score={item.analysis.regional_bias}
                    color="from-purple-500 to-pink-500"
                  />
                  <BiasBar
                    label="Sentiment Bias"
                    score={item.analysis.sentiment_bias}
                    color="from-orange-500 to-red-500"
                  />
                  <BiasBar
                    label="Source Reliability"
                    score={item.analysis.source_reliability_bias}
                    color="from-green-500 to-teal-500"
                  />
                  <BiasBar
                    label="Representation Bias"
                    score={item.analysis.representation_bias}
                    color="from-yellow-500 to-amber-500"
                  />
                  <BiasBar
                    label="Language Bias"
                    score={item.analysis.language_bias}
                    color="from-red-500 to-rose-500"
                  />

                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(item.collected_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">Try adjusting your filters or search term</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-r ${getBiasColor(selectedItem.analysis.overall_score)} p-8 text-white sticky top-0 z-10`}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-3xl font-bold flex-1 pr-4">{selectedItem.title}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full font-medium">
                  {selectedItem.source.name}
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  {selectedItem.region}
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  {selectedItem.source.language}
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full font-bold">
                  Bias Score: {Math.round(selectedItem.analysis.overall_score)}/100
                </span>
              </div>
            </div>

            <div className="p-8">
              <div className="prose max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">{selectedItem.content}</p>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Detailed Bias Analysis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(selectedItem.analysis.detailed_analysis || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3 capitalize flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      {key.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Score: {Math.round(value.score || 0)}/100
                    </p>
                    <p className="text-sm text-gray-600 mb-3">{value.explanation}</p>
                    {value.evidence && value.evidence.length > 0 && (
                      <div className="space-y-1 mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Evidence:</p>
                        {value.evidence.map((evidence: string, idx: number) => (
                          <p key={idx} className="text-xs text-gray-600 italic flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{evidence}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedItem.url && (
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Original Article
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
