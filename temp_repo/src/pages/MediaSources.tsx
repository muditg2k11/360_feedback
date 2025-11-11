import { useState, useEffect } from 'react';
import { indianLanguages } from '../constants';
import { Radio, Search, Filter, Plus, ExternalLink, ToggleLeft, ToggleRight, Star, Play, Loader } from 'lucide-react';
import { MediaSource } from '../types';
import { dataService } from '../services/dataService';
import { scrapingService } from '../services/scrapingService';

export default function MediaSources() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'newspaper' as const,
    language: 'English',
    region: '',
    url: '',
    credibility_score: 0.7,
    active: true,
  });

  useEffect(() => {
    loadMediaSources();

    const timeoutId = setTimeout(() => {
      console.warn('[MediaSources] Loading timeout - forcing completion');
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  const loadMediaSources = async () => {
    console.log('[MediaSources] Starting to load media sources...');
    setIsLoading(true);

    try {
      console.log('[MediaSources] Calling dataService.getMediaSources()');
      const sources = await dataService.getMediaSources();
      console.log('[MediaSources] Received sources:', sources.length);
      console.log('[MediaSources] Source names:', sources.map(s => s.name));
      console.log('[MediaSources] Full data:', sources);
      setMediaSources(sources);
      console.log('[MediaSources] State updated with sources');
    } catch (error) {
      console.error('[MediaSources] Error loading media sources:', error);
      setMediaSources([]);
    } finally {
      console.log('[MediaSources] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleScrapeSource = async (sourceId: string) => {
    setScrapingSourceId(sourceId);
    setScrapeMessage('');

    try {
      const result = await scrapingService.scrapeNews(sourceId);

      if (result.success && result.results) {
        const sourceResult = result.results[0];
        setScrapeMessage(
          `Successfully scraped ${sourceResult.articlesSaved || 0} articles from ${sourceResult.sourceName}`
        );
      } else {
        setScrapeMessage(`Error: ${result.error || 'Scraping failed'}`);
      }
    } catch (error) {
      console.error('Error scraping source:', error);
      setScrapeMessage('Failed to scrape source');
    } finally {
      setScrapingSourceId(null);
      setTimeout(() => setScrapeMessage(''), 5000);
    }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    setScrapeMessage('');

    try {
      const result = await scrapingService.scrapeNews();

      if (result.success) {
        const totalArticles = result.results?.reduce(
          (sum, r) => sum + (r.articlesSaved || 0),
          0
        ) || 0;
        setScrapeMessage(`Successfully scraped ${totalArticles} articles from all sources`);
      } else {
        setScrapeMessage(`Error: ${result.error || 'Scraping failed'}`);
      }
    } catch (error) {
      console.error('Error scraping all sources:', error);
      setScrapeMessage('Failed to scrape sources');
    } finally {
      setScrapingAll(false);
      setTimeout(() => setScrapeMessage(''), 5000);
    }
  };

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.region) {
      setScrapeMessage('Error: Please fill in required fields - Name and Region');
      return;
    }

    try {
      const result = await dataService.createMediaSource(newSource);
      if (!result) {
        setScrapeMessage('Failed to add media source. Check database connection.');
        return;
      }
      console.log('Media source created:', result);
      setScrapeMessage('Media source added successfully!');
      setShowAddModal(false);
      setNewSource({
        name: '',
        type: 'newspaper',
        language: 'English',
        region: '',
        url: '',
        credibility_score: 0.7,
        active: true,
      });
      await loadMediaSources();
    } catch (error: any) {
      console.error('Error adding media source:', error);
      const errorMsg = error?.message || 'Failed to add media source. Check console for details.';
      setScrapeMessage(`Error: ${errorMsg}`);
    }
  };

  const filteredSources = mediaSources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || source.type === typeFilter;
    const matchesLanguage =
      languageFilter === 'all' || source.language === languageFilter;
    return matchesSearch && matchesType && matchesLanguage;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'newspaper':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'tv':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'radio':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'social_media':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'online':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-orange-600';
    return 'text-red-600';
  };

  const stats = {
    total: mediaSources.length,
    active: mediaSources.filter((s) => s.active).length,
    avgCredibility:
      mediaSources.length > 0
        ? mediaSources.reduce((sum, s) => sum + s.credibility_score, 0) / mediaSources.length
        : 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading media sources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Sources</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor regional media sources
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll || mediaSources.length === 0}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scrapingAll ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            <span>{scrapingAll ? 'Scraping...' : 'Scrape All'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {scrapeMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">{scrapeMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Sources</span>
            <Radio className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500 mt-1">Registered sources</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Sources</span>
            <ToggleRight className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
          <p className="text-sm text-gray-500 mt-1">Currently monitored</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Avg Credibility
            </span>
            <Star className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(stats.avgCredibility * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Source reliability</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Types</option>
              <option value="newspaper">Newspaper</option>
              <option value="tv">Television</option>
              <option value="radio">Radio</option>
              <option value="social_media">Social Media</option>
              <option value="online">Online</option>
              <option value="magazine">Magazine</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Languages</option>
              {indianLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(
                      source.type
                    )}`}
                  >
                    {source.type.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {source.language}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {source.region}
                  </span>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                {source.active ? (
                  <ToggleRight className="w-6 h-6 text-green-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Credibility Score</span>
                  <span
                    className={`font-semibold ${getCredibilityColor(
                      source.credibility_score
                    )}`}
                  >
                    {(source.credibility_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      source.credibility_score >= 0.8
                        ? 'bg-green-500'
                        : source.credibility_score >= 0.6
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${source.credibility_score * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Added {new Date(source.created_at).toLocaleDateString('en-IN')}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleScrapeSource(source.id)}
                    disabled={scrapingSourceId === source.id}
                    className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {scrapingSourceId === source.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{scrapingSourceId === source.id ? 'Scraping...' : 'Scrape'}</span>
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    View Stats
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No media sources found matching your criteria.</p>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Media Source</h2>
              <p className="text-gray-600 mt-1">Enter the details of the new media source</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="e.g., The Times of India"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="newspaper">Newspaper</option>
                    <option value="tv">Television</option>
                    <option value="radio">Radio</option>
                    <option value="social_media">Social Media</option>
                    <option value="online">Online</option>
                    <option value="magazine">Magazine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={newSource.language}
                    onChange={(e) => setNewSource({ ...newSource, language: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {indianLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSource.region}
                  onChange={(e) => setNewSource({ ...newSource, region: e.target.value })}
                  placeholder="e.g., Tamil Nadu, Kerala"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credibility Score: {(newSource.credibility_score * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={newSource.credibility_score}
                  onChange={(e) =>
                    setNewSource({ ...newSource, credibility_score: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSource.active}
                  onChange={(e) => setNewSource({ ...newSource, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">Active (start monitoring immediately)</label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
