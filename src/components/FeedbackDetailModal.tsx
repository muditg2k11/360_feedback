import { useState, useEffect } from 'react';
import Modal from './Modal';
import { FeedbackItem, MediaSource, AIAnalysis } from '../types';
import { Calendar, MapPin, Globe, Tag, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { dataService } from '../services/dataService';

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackItem;
  source?: MediaSource;
}

export default function FeedbackDetailModal({
  isOpen,
  onClose,
  feedback,
  source,
}: FeedbackDetailModalProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

  useEffect(() => {
    if (feedback.id) {
      loadAnalysis();
    }
  }, [feedback.id]);

  const loadAnalysis = async () => {
    const data = await dataService.getAnalysisByFeedbackId(feedback.id);
    setAnalysis(data);
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.2) return <TrendingUp className="w-5 h-5" />;
    if (score < -0.2) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'from-green-500 to-green-600';
    if (score < -0.2) return 'from-red-500 to-red-600';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Feedback Details" size="xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{feedback.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
            <span className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(feedback.collected_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{feedback.region}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center space-x-1">
              <Globe className="w-4 h-4" />
              <span>{feedback.original_language}</span>
            </span>
            {feedback.category && (
              <>
                <span className="text-gray-400">•</span>
                <span className="flex items-center space-x-1">
                  <Tag className="w-4 h-4" />
                  <span>{feedback.category}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {source && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Source Information</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
              <div>
                <span className="font-medium">Name:</span> {source.name}
              </div>
              <div>
                <span className="font-medium">Type:</span> {source.type}
              </div>
              <div>
                <span className="font-medium">Language:</span> {source.language}
              </div>
              <div>
                <span className="font-medium">Credibility:</span>{' '}
                {(source.credibility_score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Content</h3>
          <p className="text-gray-700 leading-relaxed">{feedback.content}</p>
        </div>

        {feedback.translated_content && feedback.original_language !== 'English' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              English Translation
            </h3>
            <p className="text-gray-700 leading-relaxed">{feedback.translated_content}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">AI Analysis Results</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-lg bg-gradient-to-br ${getSentimentColor(
                  analysis.sentiment_score
                )} text-white`}
              >
                <div className="flex items-center justify-between mb-2">
                  {getSentimentIcon(analysis.sentiment_score)}
                  <span className="text-2xl font-bold">
                    {(analysis.sentiment_score * 100).toFixed(0)}
                  </span>
                </div>
                <p className="text-sm opacity-90">Sentiment Score</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Tag className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {(analysis.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm opacity-90">Confidence Level</p>
              </div>
            </div>

            {analysis.topics && analysis.topics.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.keywords && analysis.keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.entities && analysis.entities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Named Entities</h4>
                <div className="space-y-2">
                  {analysis.entities.map((entity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm text-gray-900">{entity.text}</span>
                      <span className="text-xs px-2 py-1 bg-white border border-gray-200 rounded">
                        {entity.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>
    </Modal>
  );
}
