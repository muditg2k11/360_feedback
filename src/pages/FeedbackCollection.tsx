import { useState, useEffect } from 'react';
import { indianStates } from '../constants';
import { Search, Filter, Plus, ExternalLink, Clock, CheckCircle, Circle, Brain, Loader, RefreshCw, FileText, Globe, MapPin } from 'lucide-react';
import FeedbackDetailModal from '../components/FeedbackDetailModal';
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

  useEffect(() => {
    loadData();

    const timeoutId = setTimeout(() => {
      console.warn('[FeedbackCollection] Loading timeout - forcing completion');
      setIsLoading(false);
    }, 5000);

    const subscription = dataService.subscribeToFeedbackItems(() => {
      loadFeedbackItems();
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    console.log('[FeedbackCollection] Starting to load data...');
    setIsLoading(true);

    try {
      console.log('[FeedbackCollection] Fetching feedback and sources...');
      const [feedback, sources] = await Promise.all([
        dataService.getFeedbackItems(),
        dataService.getMediaSources(),
      ]);
      console.log('[FeedbackCollection] Received:', feedback.length, 'feedback items,', sources.length, 'sources');
      setFeedbackItems(feedback);
      setMediaSources(sources);
    } catch (error) {
      console.error('[FeedbackCollection] Error loading data:', error);
      setFeedbackItems([]);
      setMediaSources([]);
    } finally {
      console.log('[FeedbackCollection] Setting isLoading to false');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'analyzed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'validated':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const summarizeContent = (content: string, maxLength: number = 150): string => {
    if (!content) return '';

    // Remove extra whitespace
    const cleaned = content.trim().replace(/\s+/g, ' ');

    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Try to cut at sentence boundary
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    let summary = '';

    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }

    // If we got at least one sentence, return it
    if (summary.length > 0) {
      return summary.trim();
    }

    // Otherwise, cut at word boundary
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
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
    setScrapeMessage('Scraping news from RSS feeds...');
    try {
      const result = await scrapingService.scrapeNews();
      if (result.success) {
        const totalArticles = result.results?.reduce((sum, r) => sum + (r.articlesSaved || 0), 0) || 0;
        setScrapeMessage(`✓ Successfully collected ${totalArticles} new articles!`);
        await loadFeedbackItems();
        setTimeout(() => setScrapeMessage(''), 5000);
      } else {
        setScrapeMessage(`✗ Scraping failed: ${result.error || 'Unknown error'}`);
        setTimeout(() => setScrapeMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error scraping news:', error);
      setScrapeMessage(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setScrapeMessage(''), 5000);
    } finally {
      setIsScraping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Collection</h1>
          <p className="text-gray-600 mt-1">Monitor and manage regional media feedback</p>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
            {scrapeMessage && (
              <p className={`text-sm mt-1 font-medium ${
                scrapeMessage.startsWith('✓') ? 'text-green-600' :
                scrapeMessage.startsWith('✗') ? 'text-red-600' : 'text-blue-600'
              }`}>
                {scrapeMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleScrapeNow}
            disabled={isScraping}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Scraping...' : 'Collect Real-Time Data'}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Feedback</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{feedbackItems.length}</p>
              <p className="text-xs text-blue-600 font-medium">Total Articles</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">
                {feedbackItems.filter(f => f.status === 'analyzed').length}
              </p>
              <p className="text-xs text-green-600 font-medium">Analyzed</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-8 h-8 text-purple-600" />
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">
                {new Set(feedbackItems.map(f => f.original_language)).size}
              </p>
              <p className="text-xs text-purple-600 font-medium">Languages</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-8 h-8 text-orange-600" />
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-900">
                {new Set(feedbackItems.map(f => f.region).filter(Boolean)).size}
              </p>
              <p className="text-xs text-orange-600 font-medium">Regions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="analyzed">Analyzed</option>
              <option value="validated">Validated</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Regions</option>
              {indianStates.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFeedback.map((feedback) => {
          const source = mediaSources.find((s) => s.id === feedback.source_id);
          return (
            <div
              key={feedback.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{feedback.title}</h3>
                    {feedback.url && (
                      <a
                        href={feedback.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {source && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <span className="font-medium">{source.name}</span>
                      <span className="text-gray-400">•</span>
                      <span>{source.type}</span>
                      <span className="text-gray-400">•</span>
                      <span>{source.language}</span>
                    </div>
                  )}
                </div>
                <div
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getStatusColor(
                    feedback.status
                  )}`}
                >
                  {getStatusIcon(feedback.status)}
                  <span className="capitalize">{feedback.status}</span>
                </div>
              </div>

              <div className="mb-4">
                {feedback.summary ? (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center space-x-2">
                          <span>AI-Generated Summary</span>
                          <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-[10px]">
                            {feedback.original_language}
                          </span>
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {feedback.summary}
                        </p>
                        <button
                          onClick={() => openDetailModal(feedback)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-3 flex items-center space-x-1 hover:underline"
                        >
                          <span>View full article details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2 mb-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Content Preview ({feedback.original_language})
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {summarizeContent(feedback.content, 180)}
                        </p>
                      </div>
                    </div>
                    {feedback.content.length > 180 && (
                      <button
                        onClick={() => openDetailModal(feedback)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center space-x-1"
                      >
                        <span>Read full content</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {feedback.translated_content && feedback.original_language !== 'English' && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-4 mt-3 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                          English Translation Available
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {summarizeContent(feedback.translated_content, 150)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <span className="font-medium">Region:</span>
                    <span>{feedback.region}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                    {feedback.original_language}
                  </span>
                  {feedback.category && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center space-x-1">
                        <span className="font-medium">Category:</span>
                        <span>{feedback.category}</span>
                      </span>
                    </>
                  )}
                  <span className="text-gray-400">•</span>
                  <span>
                    {new Date(feedback.collected_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {feedback.status !== 'analyzed' && (
                    <button
                      onClick={() => handleAnalyze(feedback)}
                      disabled={analyzingId === feedback.id}
                      className="px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {analyzingId === feedback.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      <span>{analyzingId === feedback.id ? 'Analyzing...' : 'Analyze'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => openDetailModal(feedback)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeedback.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No feedback items found matching your criteria.</p>
        </div>
      )}

      {selectedFeedback && (
        <FeedbackDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedFeedback(null);
          }}
          feedback={selectedFeedback}
          source={mediaSources.find((s) => s.id === selectedFeedback.source_id)}
        />
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsAddModalOpen(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Feedback</h3>
              <p className="text-gray-600 mb-4">
                This feature would integrate with media monitoring APIs and web scraping tools
                to automatically collect feedback from various sources including newspapers,
                TV channels, radio stations, and social media platforms.
              </p>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
