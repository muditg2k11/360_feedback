import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, TrendingUp, Eye, BarChart3, RefreshCw } from 'lucide-react';
import { dataService } from '../services/dataService';
import { FeedbackItem, AIAnalysis } from '../types';
import { FeedbackDetailModal } from '../components/FeedbackDetailModal';
import { supabase } from '../lib/supabase';

export default function BiasDetection() {
  const [analyzedFeedback, setAnalyzedFeedback] = useState<FeedbackItem[]>([]);
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);

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

  const handleReanalyze = async () => {
    if (!confirm('This will reanalyze all 326 articles with the updated bias detection algorithm. This may take a few minutes. Continue?')) {
      return;
    }

    setIsReanalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to reanalyze articles');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reanalyze-bias`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Successfully reanalyzed ${result.processed} articles!`);
        await loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error reanalyzing:', error);
      alert('Failed to reanalyze articles. Check console for details.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getBiasLevel = (score: number): string => {
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const getBiasClassification = (analysis: AIAnalysis): string => {
    if (analysis.bias_indicators && (analysis.bias_indicators as any).overall_classification) {
      return (analysis.bias_indicators as any).overall_classification;
    }
    const maxBias = Math.max(
      ...Object.values(analysis.bias_indicators || {}).map(v => typeof v === 'number' ? v * 100 : 0)
    );
    if (maxBias >= 60) return 'High Bias';
    if (maxBias >= 30) return 'Medium Bias';
    return 'Low Bias';
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
      const classification = getBiasClassification(analysis);

      if (classification === 'High Bias') biasStats.highBias++;
      else if (classification === 'Medium Bias') biasStats.mediumBias++;
      else biasStats.lowBias++;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bias Detection</h1>
          <p className="text-gray-600 mt-1">
            Identify and monitor potential bias in media coverage
          </p>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={isReanalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
          {isReanalyzing ? 'Reanalyzing...' : 'Reanalyze All Articles'}
        </button>
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

            const classification = getBiasClassification(analysis);
            const overallScore = (analysis.bias_indicators as any).overall_score || 0;
            const detailedAnalysis = (analysis.bias_indicators as any).detailed_analysis;

            const level = classification === 'High Bias' ? 'high' : classification === 'Medium Bias' ? 'medium' : 'low';

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
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getBiasColor(
                        level
                      )}`}
                    >
                      {getBiasIcon(level)}
                      <span>{classification}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setSelectedAnalysis(analysis);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View detailed analysis"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Political</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).political_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Regional</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).regional_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sentiment</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).sentiment_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).source_reliability_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Representation</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).representation_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Language</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((analysis.bias_indicators as any).language_bias * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {detailedAnalysis && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-2">Key Findings:</p>
                    <div className="space-y-1">
                      {detailedAnalysis.political?.evidence?.[0] && (
                        <p className="text-xs text-gray-600">• {detailedAnalysis.political.evidence[0]}</p>
                      )}
                      {detailedAnalysis.sentiment?.evidence?.[0] && (
                        <p className="text-xs text-gray-600">• {detailedAnalysis.sentiment.evidence[0]}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedFeedback && selectedAnalysis && (
        <BiasDetailModal
          feedback={selectedFeedback}
          analysis={selectedAnalysis}
          onClose={() => {
            setSelectedFeedback(null);
            setSelectedAnalysis(null);
          }}
        />
      )}
    </div>
  );
}

interface BiasDetailModalProps {
  feedback: FeedbackItem;
  analysis: AIAnalysis;
  onClose: () => void;
}

function BiasDetailModal({ feedback, analysis, onClose }: BiasDetailModalProps) {
  const detailedAnalysis = (analysis.bias_indicators as any).detailed_analysis || {};
  const classification = (analysis.bias_indicators as any).overall_classification || 'Low Bias';
  const overallScore = (analysis.bias_indicators as any).overall_score || 0;

  const biasDimensions = [
    { name: 'Political Bias', key: 'political', color: 'bg-red-500' },
    { name: 'Regional Bias', key: 'regional', color: 'bg-orange-500' },
    { name: 'Sentiment Bias', key: 'sentiment', color: 'bg-yellow-500' },
    { name: 'Source Reliability', key: 'source_reliability', color: 'bg-blue-500' },
    { name: 'Representation Bias', key: 'representation', color: 'bg-purple-500' },
    { name: 'Language Bias', key: 'language', color: 'bg-green-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Comprehensive Bias Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">6-Dimensional Bias Detection Framework</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{feedback.title}</h3>
            <p className="text-sm text-gray-600">{feedback.content}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Assessment</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                classification === 'High Bias' ? 'bg-red-100 text-red-700' :
                classification === 'Medium Bias' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                {classification}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    overallScore >= 60 ? 'bg-red-500' :
                    overallScore >= 30 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${overallScore}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 min-w-[3rem]">{overallScore.toFixed(0)}/100</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Dimensional Breakdown</h3>
            {biasDimensions.map((dimension) => {
              const data = detailedAnalysis[dimension.key];
              if (!data) return null;

              const score = data.score || 0;

              return (
                <div key={dimension.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{dimension.name}</h4>
                    <span className="text-sm font-medium text-gray-600">{score.toFixed(0)}/100</span>
                  </div>

                  <div className="mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${dimension.color}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Explanation:</p>
                      <p className="text-sm text-gray-600">{data.explanation}</p>
                    </div>

                    {data.evidence && data.evidence.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Evidence:</p>
                        <ul className="space-y-1">
                          {data.evidence.map((item: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-600 pl-3">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
