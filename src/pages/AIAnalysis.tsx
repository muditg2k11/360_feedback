import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, Tag, MapPin } from 'lucide-react';
import { FeedbackItem, AIAnalysis } from '../types';
import { dataService } from '../services/dataService';

export default function AIAnalysisPage() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feedback, allAnalyses] = await Promise.all([
        dataService.getFeedbackItems(),
        dataService.getAllAnalyses(),
      ]);

      const analyzedFeedback = feedback.filter((f) => f.status === 'analyzed');
      setFeedbackItems(analyzedFeedback);
      setAnalyses(allAnalyses);

      if (analyzedFeedback.length > 0) {
        setSelectedFeedback(analyzedFeedback[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const feedback = feedbackItems.find((f) => f.id === selectedFeedback);
  const analysis = feedback
    ? analyses.find((a) => a.feedback_id === feedback.id)
    : null;

  const getSentimentIcon = (score: number) => {
    if (score > 0.2) return <TrendingUp className="w-5 h-5" />;
    if (score < -0.2) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'from-green-500 to-green-600 text-white';
    if (score < -0.2) return 'from-red-500 to-red-600 text-white';
    return 'from-gray-500 to-gray-600 text-white';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.5) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Negative';
    return 'Very Negative';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading analyses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI/ML Analysis</h1>
        <p className="text-gray-600 mt-1">
          Automated sentiment analysis and topic extraction
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Feedback Item
          </h2>
          <div className="space-y-2">
            {feedbackItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedFeedback(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedFeedback === item.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {item.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-600">{item.region}</p>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {item.original_language}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {feedback && analysis ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {feedback.title}
                </h2>
                <p className="text-gray-700 mb-4">{feedback.content}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{feedback.region}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{feedback.original_language}</span>
                  <span className="text-gray-400">•</span>
                  <span>
                    {new Date(feedback.collected_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Sentiment Analysis
                    </h2>
                    <p className="text-sm text-gray-600">
                      Confidence: {(analysis.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div
                      className={`p-6 rounded-xl bg-gradient-to-br ${getSentimentColor(
                        analysis.sentiment_score
                      )} mb-4`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getSentimentIcon(analysis.sentiment_score)}
                        <span className="text-3xl font-bold">
                          {(analysis.sentiment_score * 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">
                        {getSentimentLabel(analysis.sentiment_score)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Sentiment Score</span>
                          <span className="font-medium text-gray-900">
                            {analysis.sentiment_score.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${getSentimentColor(
                              analysis.sentiment_score
                            )}`}
                            style={{
                              width: `${((analysis.sentiment_score + 1) / 2) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Confidence</span>
                          <span className="font-medium text-gray-900">
                            {(analysis.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{ width: `${analysis.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Bias Indicators
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(analysis.bias_indicators).map(([key, value]) => {
                        const numValue = value as number;
                        const label = key
                          .split('_')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ');
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">{label}</span>
                              <span className="font-medium text-gray-900">
                                {(numValue * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  numValue > 0.5
                                    ? 'bg-red-500'
                                    : numValue > 0.3
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${numValue * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Extracted Topics
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Keywords</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords && analysis.keywords.length > 0 ? (
                      analysis.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No keywords detected</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Named Entities
                </h3>
                <div className="space-y-2">
                  {analysis.entities && analysis.entities.length > 0 ? (
                    analysis.entities.map((entity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-900">{entity.text}</span>
                        <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600">
                          {entity.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No entities detected</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Select a feedback item to view its analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
