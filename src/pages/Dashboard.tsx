import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Eye,
  Activity,
  MapPin,
  Calendar,
  Zap,
  BarChart3,
  Radio
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  totalArticles: number
  analyzedArticles: number
  averageBias: number
  highBiasCount: number
  recentTrend: 'up' | 'down' | 'stable'
  sourcesActive: number
  articlesToday: number
  regionsActive: number
}

interface BiasDistribution {
  category: string
  count: number
  percentage: number
  color: string
}

interface RecentArticle {
  id: string
  title: string
  source_name: string
  bias_score: number
  sentiment: string
  collected_at: string
  region: string
}

interface TimeSeriesData {
  date: string
  articles: number
  avgBias: number
  positive: number
  negative: number
  neutral: number
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316'
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    analyzedArticles: 0,
    averageBias: 0,
    highBiasCount: 0,
    recentTrend: 'stable',
    sourcesActive: 0,
    articlesToday: 0,
    regionsActive: 0
  })

  const [biasDistribution, setBiasDistribution] = useState<BiasDistribution[]>([])
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    loadDashboardData()

    const subscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback_items' },
        (payload) => {
          console.log('New article detected!', payload)
          setLiveCount(prev => prev + 1)
          loadDashboardData()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_analyses' },
        (payload) => {
          console.log('Analysis updated!', payload)
          loadDashboardData()
        }
      )
      .subscribe()

    const interval = setInterval(loadDashboardData, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: articles, error: articlesError } = await supabase
        .from('feedback_items')
        .select('id, status, collected_at, region')

      if (articlesError) throw articlesError

      const { data: analyses, error: analysesError } = await supabase
        .from('ai_analyses')
        .select('bias_indicators, sentiment_label, feedback_id')

      if (analysesError) throw analysesError

      const { data: sources, error: sourcesError } = await supabase
        .from('media_sources')
        .select('id, active, region')
        .eq('active', true)

      if (sourcesError) throw sourcesError

      const totalArticles = articles?.length || 0
      const analyzedArticles = articles?.filter(a => a.status === 'analyzed').length || 0

      const biasScores = analyses?.map(a => {
        const indicators = a.bias_indicators as any
        return indicators?.overall_score || 0
      }) || []

      const averageBias = biasScores.length > 0
        ? Math.round(biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length)
        : 0

      const highBiasCount = biasScores.filter(score => score >= 65).length

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const articlesToday = articles?.filter(a =>
        new Date(a.collected_at) >= today
      ).length || 0

      const regions = new Set(articles?.map(a => a.region).filter(Boolean) || [])
      const regionsActive = regions.size

      setStats({
        totalArticles,
        analyzedArticles,
        averageBias,
        highBiasCount,
        recentTrend: articlesToday > 100 ? 'up' : articlesToday < 50 ? 'down' : 'stable',
        sourcesActive: sources?.length || 0,
        articlesToday,
        regionsActive
      })

      const lowBias = biasScores.filter(s => s < 35).length
      const mediumBias = biasScores.filter(s => s >= 35 && s < 65).length
      const highBias = biasScores.filter(s => s >= 65).length
      const total = biasScores.length || 1

      setBiasDistribution([
        { category: 'Low Bias', count: lowBias, percentage: Math.round((lowBias / total) * 100), color: COLORS.success },
        { category: 'Medium Bias', count: mediumBias, percentage: Math.round((mediumBias / total) * 100), color: COLORS.warning },
        { category: 'High Bias', count: highBias, percentage: Math.round((highBias / total) * 100), color: COLORS.danger }
      ])

      const { data: recentData, error: recentError } = await supabase
        .from('feedback_items')
        .select(`
          id,
          title,
          collected_at,
          region,
          media_sources (name),
          ai_analyses (
            bias_indicators,
            sentiment_label
          )
        `)
        .order('collected_at', { ascending: false })
        .limit(10)

      if (!recentError && recentData) {
        const formattedRecent = recentData.map((item: any) => ({
          id: item.id,
          title: item.title,
          source_name: item.media_sources?.name || 'Unknown',
          bias_score: item.ai_analyses?.[0]?.bias_indicators?.overall_score || 0,
          sentiment: item.ai_analyses?.[0]?.sentiment_label || 'neutral',
          collected_at: item.collected_at,
          region: item.region || 'India'
        }))
        setRecentArticles(formattedRecent)
      }

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const timeData = last7Days.map(date => {
        const dayArticles = articles?.filter(a =>
          a.collected_at.startsWith(date)
        ) || []

        const dayAnalyses = dayArticles
          .map(a => analyses?.find((an: any) => an.feedback_id === a.id))
          .filter(Boolean)

        const avgBias = dayAnalyses.length > 0
          ? dayAnalyses.reduce((sum: number, a: any) => sum + (a.bias_indicators?.overall_score || 0), 0) / dayAnalyses.length
          : 0

        const sentiments = dayAnalyses.map((a: any) => a.sentiment_label || 'neutral')

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          articles: dayArticles.length,
          avgBias: Math.round(avgBias),
          positive: sentiments.filter(s => s === 'positive').length,
          negative: sentiments.filter(s => s === 'negative').length,
          neutral: sentiments.filter(s => s === 'neutral' || s === 'mixed').length
        }
      })

      setTimeSeriesData(timeData)

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: any) => (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${color} opacity-10`}></div>
      </div>
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">{title}</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Activity className="w-10 h-10" />
                India News Bias Detection
              </h1>
              <p className="mt-2 text-blue-100 text-lg">Real-time news analysis across 40+ Indian media sources</p>
            </div>
            <div className="flex items-center gap-4">
              {liveCount > 0 && (
                <div className="bg-white/20 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-2 animate-pulse">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <span className="font-semibold">{liveCount} new articles</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-blue-100">Last updated</p>
                <p className="font-semibold">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Articles"
            value={stats.totalArticles.toLocaleString()}
            subtitle={`${stats.articlesToday} collected today`}
            icon={FileText}
            trend={stats.recentTrend}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            title="Analyzed"
            value={stats.analyzedArticles.toLocaleString()}
            subtitle={`${Math.round((stats.analyzedArticles / (stats.totalArticles || 1)) * 100)}% completion rate`}
            icon={Eye}
            color="from-green-500 to-green-600"
          />
          <StatCard
            title="Average Bias"
            value={`${stats.averageBias}%`}
            subtitle={`${stats.highBiasCount} high bias articles`}
            icon={BarChart3}
            color="from-orange-500 to-orange-600"
          />
          <StatCard
            title="Active Sources"
            value={stats.sourcesActive}
            subtitle={`${stats.regionsActive} regions covered`}
            icon={Radio}
            color="from-purple-500 to-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Articles Collection Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="articles"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  fill="url(#colorArticles)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Bias Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={biasDistribution as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.category}: ${entry.percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {biasDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {biasDistribution.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-gray-600">{item.category}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Sentiment Analysis Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="positive" stackId="a" fill={COLORS.success} name="Positive" radius={[4, 4, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill={COLORS.warning} name="Neutral" />
              <Bar dataKey="negative" stackId="a" fill={COLORS.danger} name="Negative" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Latest Articles
              <span className="ml-auto text-sm font-normal text-gray-500">Real-time updates</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bias Score</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2">{article.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{article.source_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {article.region}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div
                            className={`h-2 rounded-full ${
                              article.bias_score < 35 ? 'bg-green-500' :
                              article.bias_score < 65 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${article.bias_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-10">{article.bias_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        article.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        article.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {article.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(article.collected_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
