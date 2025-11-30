import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, MapPin, CheckCircle, Loader, TrendingUp, AlertCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Report } from '../types';
import { supabase } from '../lib/supabase';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);

  useEffect(() => {
    loadReports();
    loadFeedbackStats();
  }, []);

  const loadReports = async () => {
    try {
      const data = await dataService.getReports();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const feedback = await dataService.getFeedbackItems();
      const stats = {
        total: feedback.length,
        analyzed: feedback.filter(f => f.status === 'analyzed').length,
        pending: feedback.filter(f => f.status === 'processing' || f.status === 'pending').length,
        byRegion: feedback.reduce((acc, item) => {
          acc[item.region] = (acc[item.region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byLanguage: feedback.reduce((acc, item) => {
          acc[item.original_language] = (acc[item.original_language] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      setFeedbackStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const feedback = await dataService.getFeedbackItems();
      const analyzedFeedback = feedback.filter(f => f.status === 'analyzed');

      const regions = [...new Set(feedback.map(f => f.region))];
      const departments = ['Information & Broadcasting', 'Media Relations'];

      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);

      const regionStats = regions.map(region => {
        const regionFeedback = analyzedFeedback.filter(f => f.region === region);
        return {
          region,
          count: regionFeedback.length,
          avgSentiment: regionFeedback.length > 0
            ? regionFeedback.reduce((sum, f) => sum + (f.sentiment_score || 0), 0) / regionFeedback.length
            : 0
        };
      }).sort((a, b) => b.count - a.count);

      const insights = [
        {
          title: `Total ${analyzedFeedback.length} articles analyzed in the last 30 days`,
          description: `Across ${regions.length} regions with ${new Set(feedback.map(f => f.original_language)).size} languages monitored`
        },
        {
          title: `Top region: ${regionStats[0]?.region || 'N/A'}`,
          description: `${regionStats[0]?.count || 0} articles collected with average sentiment of ${(regionStats[0]?.avgSentiment || 0).toFixed(2)}`
        }
      ];

      const recommendations = [
        {
          priority: 'high',
          recommendation: 'Increase monitoring in regions with lower coverage to ensure comprehensive national representation'
        },
        {
          priority: 'medium',
          recommendation: 'Focus on regional language content to better understand local sentiment and concerns'
        }
      ];

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([
          {
            title: `Media Analysis Report - ${new Date().toLocaleDateString()}`,
            report_type: 'monthly',
            summary: `Comprehensive analysis of ${analyzedFeedback.length} media articles across ${regions.length} regions. Total articles: ${feedback.length}, Regions covered: ${regions.length}, Languages: ${new Set(feedback.map(f => f.original_language)).size}`,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            regions,
            departments,
            status: 'published',
            insights,
            recommendations
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error inserting report:', error);
        throw error;
      }

      await loadReports();
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'monthly':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'quarterly':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'annual':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'custom':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analysis reports and insights
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      {feedbackStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{feedbackStats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Analyzed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{feedbackStats.analyzed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{feedbackStats.pending}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regions</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{Object.keys(feedbackStats.byRegion).length}</p>
              </div>
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No reports available yet</p>
          <p className="text-sm text-gray-400">Click "Generate Report" to create your first comprehensive analysis report</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
                    <div
                      className={`px-3 py-1 rounded-full border text-sm font-medium ${getReportTypeColor(
                        report.report_type
                      )}`}
                    >
                      {report.report_type}
                    </div>
                    {report.status === 'published' && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Published</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4">{report.summary}</p>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(report.period_start).toLocaleDateString()} -{' '}
                        {new Date(report.period_end).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{report.departments.join(', ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{report.regions.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                  <span>Export</span>
                </button>
              </div>

              {report.insights && report.insights.length > 0 && (
                <div className="mb-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Key Insights</h3>
                  <div className="space-y-2">
                    {report.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                        <div>
                          <p className="font-medium text-gray-900">{insight.title}</p>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.recommendations && report.recommendations.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {report.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <span
                          className={`text-sm font-medium ${getPriorityColor(
                            rec.priority
                          )} uppercase mt-1`}
                        >
                          {rec.priority}
                        </span>
                        <p className="text-gray-700 flex-1">{rec.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
