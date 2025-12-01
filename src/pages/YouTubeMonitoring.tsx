import { useState, useEffect } from 'react';
import { Youtube, Search, Filter, ExternalLink, ThumbsUp, Eye, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { YouTubeVideo } from '../types';
import { supabase } from '../lib/supabase';

export default function YouTubeMonitoring() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [channels, setChannels] = useState<string[]>([]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setVideos(data as YouTubeVideo[]);
        const uniqueChannels = [...new Set(data.map(v => v.channel_name))];
        setChannels(uniqueChannels);
      }
    } catch (error) {
      console.error('Error loading YouTube videos:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.channel_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || video.channel_name === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const stats = {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.view_count, 0),
    totalChannels: channels.length,
    avgEngagement: videos.length > 0
      ? videos.reduce((sum, v) => sum + v.like_count + v.comment_count, 0) / videos.length
      : 0,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (label?: string) => {
    switch (label) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      case 'mixed': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading YouTube videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">YouTube Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Track and analyze YouTube videos from monitored channels
          </p>
        </div>
        <Youtube className="w-10 h-10 text-red-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Videos</span>
            <Youtube className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalVideos}</p>
          <p className="text-sm text-gray-500 mt-1">Monitored videos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Views</span>
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</p>
          <p className="text-sm text-gray-500 mt-1">Across all videos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Channels</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalChannels}</p>
          <p className="text-sm text-gray-500 mt-1">Active channels</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Engagement</span>
            <ThumbsUp className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(Math.round(stats.avgEngagement))}</p>
          <p className="text-sm text-gray-500 mt-1">Likes + Comments</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
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
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Channels</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{video.channel_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(video.published_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <a
                  href={`https://youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(video.view_count)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{formatNumber(video.like_count)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{formatNumber(video.comment_count)}</span>
                </div>
              </div>

              {video.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {video.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    video.status === 'analyzed' ? 'bg-green-100 text-green-700 border-green-200' :
                    video.status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {video.status}
                  </span>
                  {video.sentiment_label && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getSentimentColor(video.sentiment_label)}`}>
                      {video.sentiment_label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Youtube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No YouTube videos found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
