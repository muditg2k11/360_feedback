import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { FileText, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { dataService } from '../services/dataService';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();

    const feedbackSubscription = dataService.subscribeToFeedbackItems(() => {
      loadDashboardStats();
    });

    const analysesSubscription = dataService.subscribeToAnalyses(() => {
      loadDashboardStats();
    });

    return () => {
      feedbackSubscription.unsubscribe();
      analysesSubscription.unsubscribe();
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await dataService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">No data available</div>
      </div>
    );
  }

  const sentimentPercentage = ((stats.avgSentiment + 1) / 2) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Real-time insights into regional media feedback
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Feedback Items"
          value={stats.totalFeedback.toLocaleString()}
          icon={FileText}
          trend={{ value: '12%', positive: true }}
          color="blue"
        />
        <StatCard
          title="Analyzed Today"
          value={stats.analyzedToday}
          icon={TrendingUp}
          trend={{ value: '8%', positive: true }}
          color="green"
        />
        <StatCard
          title="Average Sentiment"
          value={`${sentimentPercentage.toFixed(0)}%`}
          icon={Target}
          trend={{ value: '5%', positive: true }}
          color="orange"
        />
        <StatCard
          title="Bias Alerts"
          value={stats.biasDetected}
          icon={AlertTriangle}
          trend={{ value: '3%', positive: false }}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sentiment Distribution
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Positive', value: stats.sentimentDistribution.positive, color: 'bg-green-500' },
              { label: 'Neutral', value: stats.sentimentDistribution.neutral, color: 'bg-gray-500' },
              { label: 'Negative', value: stats.sentimentDistribution.negative, color: 'bg-red-500' },
              { label: 'Mixed', value: stats.sentimentDistribution.mixed, color: 'bg-orange-500' },
            ].map((item) => {
              const percentage = (item.value / stats.totalFeedback) * 100;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm text-gray-600">
                      {item.value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Regions by Feedback Volume
          </h2>
          <div className="space-y-3">
            {stats.regionalDistribution.slice(0, 6).map((region, index) => {
              const percentage = (region.count / stats.totalFeedback) * 100;
              const sentimentColor =
                region.sentiment > 0.3 ? 'text-green-600' : region.sentiment < -0.1 ? 'text-red-600' : 'text-gray-600';
              return (
                <div key={region.region} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{region.region}</span>
                      <span className="text-sm text-gray-600">{region.count}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${sentimentColor}`}>
                        {(region.sentiment * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h2>
          <div className="space-y-3">
            {stats.trendingTopics.slice(0, 8).map((topic) => {
              const sentimentColor =
                topic.sentiment > 0.3
                  ? 'bg-green-100 text-green-700'
                  : topic.sentiment < -0.1
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700';
              return (
                <div key={topic.topic} className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{topic.topic}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{topic.count} mentions</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${sentimentColor}`}
                    >
                      {(topic.sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Language Distribution
          </h2>
          <div className="space-y-4">
            {stats.languageDistribution.map((lang) => {
              const percentage = (lang.count / stats.totalFeedback) * 100;
              return (
                <div key={lang.language}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{lang.language}</span>
                    <span className="text-sm text-gray-600">
                      {lang.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
