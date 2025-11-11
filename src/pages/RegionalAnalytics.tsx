import { useState, useEffect } from 'react';
import { MapPin, TrendingUp, TrendingDown, BarChart3, Globe } from 'lucide-react';
import { dataService } from '../services/dataService';

export default function RegionalAnalytics() {
  const [regionalDistribution, setRegionalDistribution] = useState<Array<{
    region: string;
    count: number;
    sentiment: number;
  }>>([]);
  const [languageDistribution, setLanguageDistribution] = useState<Array<{
    language: string;
    count: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stats = await dataService.getDashboardStats();
      setRegionalDistribution(stats.regionalDistribution);
      setLanguageDistribution(stats.languageDistribution);
    } catch (error) {
      console.error('Error loading regional analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return 'from-green-500 to-green-600';
    if (sentiment > 0.3) return 'from-green-400 to-green-500';
    if (sentiment > 0) return 'from-gray-400 to-gray-500';
    if (sentiment > -0.3) return 'from-orange-400 to-orange-500';
    return 'from-red-500 to-red-600';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="w-5 h-5" />;
    if (sentiment < -0.1) return <TrendingDown className="w-5 h-5" />;
    return <BarChart3 className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading regional analytics...</div>
      </div>
    );
  }

  if (regionalDistribution.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regional Analytics</h1>
          <p className="text-gray-600 mt-1">
            Geographic distribution and sentiment patterns across Indian states
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No regional data available. Start collecting feedback to see analytics.</p>
        </div>
      </div>
    );
  }

  const totalFeedback = regionalDistribution.reduce((sum, r) => sum + r.count, 0);
  const avgSentiment =
    regionalDistribution.reduce((sum, r) => sum + r.sentiment * r.count, 0) / totalFeedback;

  const sortedByCount = [...regionalDistribution].sort((a, b) => b.count - a.count);
  const sortedBySentiment = [...regionalDistribution].sort(
    (a, b) => b.sentiment - a.sentiment
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Regional Analytics</h1>
        <p className="text-gray-600 mt-1">
          Geographic distribution and sentiment patterns across Indian states
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Regions</span>
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {regionalDistribution.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Active monitoring regions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Feedback</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {totalFeedback.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Across all regions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Sentiment</span>
            {getSentimentIcon(avgSentiment)}
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(avgSentiment * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">National average</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Regions by Feedback Volume
          </h2>
          <div className="space-y-4">
            {sortedByCount.map((region, index) => {
              const percentage = (region.count / totalFeedback) * 100;
              return (
                <div key={region.region}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{region.region}</span>
                    </div>
                    <span className="text-sm text-gray-600">{region.count}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Regions by Sentiment Score
          </h2>
          <div className="space-y-4">
            {sortedBySentiment.map((region, index) => {
              const sentimentPercentage = (region.sentiment + 1) / 2 * 100;
              return (
                <div key={region.region}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${getSentimentColor(
                          region.sentiment
                        )} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{region.region}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {(region.sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${getSentimentColor(
                          region.sentiment
                        )}`}
                        style={{ width: `${sentimentPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {region.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Language Distribution
            </h2>
          </div>
          <div className="space-y-4">
            {languageDistribution.map((lang) => {
              const percentage = (lang.count / totalFeedback) * 100;
              const getLanguageColor = (language: string) => {
                const colors: Record<string, string> = {
                  'English': 'from-blue-500 to-blue-600',
                  'Hindi': 'from-orange-500 to-orange-600',
                  'Tamil': 'from-purple-500 to-purple-600',
                  'Telugu': 'from-green-500 to-green-600',
                  'Bengali': 'from-red-500 to-red-600',
                };
                return colors[language] || 'from-gray-500 to-gray-600';
              };
              return (
                <div key={lang.language}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{lang.language}</span>
                    <span className="text-sm text-gray-600">
                      {lang.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${getLanguageColor(lang.language)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Regional Sentiment Map
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {regionalDistribution.slice(0, 8).map((region) => {
              return (
                <div
                  key={region.region}
                  className={`p-4 rounded-lg bg-gradient-to-br ${getSentimentColor(
                    region.sentiment
                  )} text-white`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <MapPin className="w-5 h-5 opacity-80" />
                    {getSentimentIcon(region.sentiment)}
                  </div>
                  <h3 className="font-semibold mb-1">{region.region}</h3>
                  <p className="text-sm opacity-90">{region.count} items</p>
                  <p className="text-lg font-bold mt-1">
                    {(region.sentiment * 100).toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Detailed Regional Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Rank
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Region
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Feedback Count
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Share
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Sentiment
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByCount.map((region, index) => {
                const percentage = (region.count / totalFeedback) * 100;
                return (
                  <tr key={region.region} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {region.region}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {region.count}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          region.sentiment > 0.3
                            ? 'text-green-600'
                            : region.sentiment < -0.1
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {(region.sentiment * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {region.sentiment > 0.3 ? (
                        <TrendingUp className="w-5 h-5 text-green-600 mx-auto" />
                      ) : region.sentiment < -0.1 ? (
                        <TrendingDown className="w-5 h-5 text-red-600 mx-auto" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-gray-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
