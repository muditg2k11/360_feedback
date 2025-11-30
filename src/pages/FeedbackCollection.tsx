import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { indianStates } from '../constants';
import {
  Search,
  Filter,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle,
  Circle,
  Brain,
  Loader,
  RefreshCw,
  FileText,
  Globe,
  MapPin,
  Sparkles,
  TrendingUp,
  Download,
  Zap,
  Eye,
  BarChart3,
  Target,
  AlertCircle
} from 'lucide-react';
import FeedbackDetailModal from '../components/FeedbackDetailModal';
import AddFeedbackModal from '../components/AddFeedbackModal';
import { FeedbackItem, MediaSource } from '../types';
import { dataService } from '../services/dataService';
import { scrapingService } from '../services/scrapingService';

export default function FeedbackCollection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scrapeMessage, setScrapeMessage] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [liveUpdates, setLiveUpdates] = useState(0);

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('feedback_live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feedback_items' },
        () => {
          setLiveUpdates(prev => prev + 1);
          loadFeedbackItems();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadFeedbackItems();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [feedback, sources] = await Promise.all([
        dataService.getFeedbackItems(),
        dataService.getMediaSources(),
      ]);
      setFeedbackItems(feedback);
      setMediaSources(sources);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      setFeedbackItems([]);
      setMediaSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedbackItems = async () => {
    try {
      const feedback = await dataService.getFeedbackItems();
      setFeedbackItems(feedback);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading feedback items:', error);
    }
  };

  const filteredFeedback = feedbackItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || item.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'from-green-500 to-emerald-500';
      case 'processing':
        return 'from-blue-500 to-cyan-500';
      case 'validated':
        return 'from-purple-500 to-pink-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const openDetailModal = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  const handleAnalyze = async (feedback: FeedbackItem) => {
    setAnalyzingId(feedback.id);
    try {
      if (feedback.original_language !== 'English' && !feedback.translated_content) {
        await scrapingService.translateContent(
          feedback.id,
          feedback.content,
          feedback.original_language
        );
      }
      const result = await scrapingService.analyzeSentiment(
        feedback.id,
        feedback.content,
        feedback.original_language
      );
      if (result.success) {
        await loadFeedbackItems();
      }
    } catch (error) {
      console.error('Error analyzing feedback:', error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleScrapeNow = async () => {
    setIsScraping(true);
    setScrapeMessage('Collecting news from media sources...');
    try {
      const result = await scrapingService.scrapeNews();
      if (result.success) {
        const totalArticles = result.results?.reduce((sum, r) => sum + (r.articlesSaved || 0), 0) || 0;
        setScrapeMessage(`Successfully collected ${totalArticles} new articles!`);
        await loadFeedbackItems();
        setTimeout(() => setScrapeMessage(''), 5000);
      } else {
        setScrapeMessage(`Scraping failed: ${result.error || 'Unknown error'}`);
        setTimeout(() => setScrapeMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error scraping news:', error);
      setScrapeMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setScrapeMessage(''), 5000);
    } finally {
      setIsScraping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="text-center">
          <Loader className="w-16 h-16 text-indigo-400 animate-spin mx-auto" />
          <p className="mt-4 text-white font-medium">Loading feedback collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                <Zap className="w-10 h-10 text-indigo-400" />
                Feedback Collection
              </h1>
              <p className="text-indigo-200 mt-2">Real-time monitoring and intelligent analysis</p>
            </div>

            <div className="flex items-center gap-3">
              {liveUpdates > 0 && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-300">{liveUpdates} new</span>
                </div>
              )}
              <button
                onClick={handleScrapeNow}
                disabled={isScraping}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Collecting...' : 'Collect Now'}</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Add Feedback</span>
              </button>
            </div>
          </div>

          {scrapeMessage && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-indigo-300">{scrapeMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-5 hover:border-blue-400/50 transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-blue-400" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-300">{feedbackItems.length}</p>
                  <p className="text-xs text-blue-400 mt-1">Total Articles</p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-5 hover:border-green-400/50 transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-300">
                    {feedbackItems.filter(f => f.status === 'analyzed').length}
                  </p>
                  <p className="text-xs text-green-400 mt-1">Analyzed</p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-xl p-5 hover:border-purple-400/50 transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <Globe className="w-8 h-8 text-purple-400" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-300">
                    {new Set(feedbackItems.map(f => f.original_language)).size}
                  </p>
                  <p className="text-xs text-purple-400 mt-1">Languages</p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-xl p-5 hover:border-amber-400/50 transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <MapPin className="w-8 h-8 text-amber-400" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-300">
                    {new Set(feedbackItems.map(f => f.region)).size}
                  </p>
                  <p className="text-xs text-amber-400 mt-1">Regions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="analyzed">Analyzed</option>
                <option value="processing">Processing</option>
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Regions</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-600/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/50 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 cursor-pointer"
                onClick={() => openDetailModal(item)}
              >
                <div className="absolute top-3 right-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor(item.status)} text-white`}>
                    {item.status}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3">{item.content}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.region}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>{item.original_language}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500">
                    {new Date(item.collected_at).toLocaleDateString()}
                  </div>
                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze(item);
                      }}
                      disabled={analyzingId === item.id}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-xs hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
                    >
                      {analyzingId === item.id ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-3 h-3" />
                          <span>Analyze</span>
                        </>
                      )}
                    </button>
                  )}
                  {item.status === 'analyzed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailModal(item);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-xs hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Results</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className="group bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer"
                onClick={() => openDetailModal(item)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor(item.status)} text-white`}>
                        {item.status}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.region}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>{item.original_language}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.collected_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(item);
                        }}
                        disabled={analyzingId === item.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
                      >
                        {analyzingId === item.id ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            <span>Analyze</span>
                          </>
                        )}
                      </button>
                    )}
                    {item.status === 'analyzed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailModal(item);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Results</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFeedback.length === 0 && (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No articles found</h3>
            <p className="text-slate-500">Try adjusting your filters or collect new data</p>
          </div>
        )}
      </div>

      {isDetailModalOpen && selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedFeedback(null);
          }}
        />
      )}

      {isAddModalOpen && (
        <AddFeedbackModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadFeedbackItems();
          }}
          mediaSources={mediaSources}
        />
      )}
    </div>
  );
}
