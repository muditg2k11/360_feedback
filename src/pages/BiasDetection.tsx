import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { dataService } from '../services/dataService';
import { FeedbackItem, AIAnalysis } from '../types';

export default function BiasDetection() {
  const [analyzedFeedback, setAnalyzedFeedback] = useState<FeedbackItem[]>([]);
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feedbackItems, analysesData] = await Promise.all([
        dataService.getFeedbackItems(),
        dataService.getAllAnalyses(),
      ]);
      setAnalyzedFeedback(feedbackItems.filter((f) => f.status === 'analyzed'));
      setAnalyses(analysesData);
    } catch (error) {
      console.error('Error loading bias detection data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBiasLevel = (score: number): string => {
    if (score > 0.5) return 'high';
    if (score > 0.3) return 'medium';
    return 'low';
  };

  const getBiasColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getBiasIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading bias detection data...</div>
      </div>
    );
  }

  if (analyzedFeedback.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bias Detection</h1>
          <p className="text-gray-600 mt-1">
            Identify and monitor potential bias in media coverage
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No analyzed feedback available. Analyze feedback items to see bias detection results.</p>
        </div>
      </div>
    );
  }

  const biasStats = {
    total: analyzedFeedback.length,
    highBias: 0,
    mediumBias: 0,
    lowBias: 0,
  };

  const analysesMap = analyses.reduce((acc, analysis) => {
    acc[analysis.feedback_id] = analysis;
    return acc;
  }, {} as Record<string, AIAnalysis>);

  analyzedFeedback.forEach((feedback) => {
    const analysis = analysesMap[feedback.id];
    if (analysis && analysis.bias_indicators) {
      const maxBias = Math.max(...Object.values(analysis.bias_indicators).map(Number));
      const level = getBiasLevel(maxBias);

      if (level === 'high') biasStats.highBias++;
      else if (level === 'medium') biasStats.mediumBias++;
      else biasStats.lowBias++;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bias Detection</h1>
        <p className="text-gray-600 mt-1">
          Identify and monitor potential bias in media coverage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Analyzed</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{biasStats.total}</p>
          <p className="text-sm text-gray-500 mt-1">Articles reviewed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">High Bias</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{biasStats.highBias}</p>
          <p className="text-sm text-gray-500 mt-1">Requires attention</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Medium Bias</span>
            <Info className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{biasStats.mediumBias}</p>
          <p className="text-sm text-gray-500 mt-1">Monitor closely</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Low Bias</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{biasStats.lowBias}</p>
          <p className="text-sm text-gray-500 mt-1">Balanced coverage</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Detected Bias Instances</h2>
        <div className="space-y-4">
          {analyzedFeedback.map((feedback) => {
            const analysis = analysesMap[feedback.id];
            if (!analysis || !analysis.bias_indicators) return null;

            const maxBias = Math.max(...Object.values(analysis.bias_indicators).map(Number));
            const level = getBiasLevel(maxBias);

            return (
              <div
                key={feedback.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{feedback.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{feedback.content}</p>
                  </div>
                  <div
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getBiasColor(
                      level
                    )}`}
                  >
                    {getBiasIcon(level)}
                    <span className="capitalize">{level} Bias</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Regional Bias</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).regional_bias * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Political Bias</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).political_bias * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Source Reliability</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).source_reliability * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
