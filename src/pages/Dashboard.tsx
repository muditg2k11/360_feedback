import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText,
  Eye,
  Target,
  Activity,
  Zap,
  Radio,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';

interface Stats {
  totalFeedback: number;
  analyzedCount: number;
  pendingCount: number;
  avgBiasScore: number;
  activeSources: number;
  todayCount: number;
  regions: number;
  recentActivity: Array<{
    title: string;
    time: string;
    type: 'analysis' | 'collection';
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalFeedback: 0,
    analyzedCount: 0,
    pendingCount: 0,
    avgBiasScore: 0,
    activeSources: 0,
    todayCount: 0,
    regions: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    loadDashboardStats();

    const subscription = supabase
      .channel('dashboard_live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feedback_items' },
        () => {
          setPulseCount(prev => prev + 1);
          loadDashboardStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ai_analyses' },
        () => {
          setPulseCount(prev => prev + 1);
          loadDashboardStats();
        }
      )
      .subscribe();

    const interval = setInterval(loadDashboardStats, 15000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      const { data: items } = await supabase
        .from('feedback_items')
        .select('id, status, collected_at, title');

      const { data: analyses } = await supabase
        .from('ai_analyses')
        .select('bias_indicators');

      const { data: sources } = await supabase
        .from('media_sources')
        .select('id, active, region')
        .eq('active', true);

      const totalFeedback = items?.length || 0;
      const analyzedCount = items?.filter(i => i.status === 'analyzed').length || 0;
      const pendingCount = items?.filter(i => i.status === 'pending').length || 0;

      const biasScores = analyses?.map(a => (a.bias_indicators as any)?.overall_score || 0) || [];
      const avgBiasScore = biasScores.length > 0
        ? Math.round(biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length)
        : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = items?.filter(i => new Date(i.collected_at) >= today).length || 0;

      const regions = new Set(sources?.map(s => s.region).filter(Boolean));

      const recentItems = items?.slice(-5).reverse().map(item => ({
        title: item.title,
        time: new Date(item.collected_at).toLocaleTimeString(),
        type: item.status === 'analyzed' ? 'analysis' as const : 'collection' as const
      })) || [];

      setStats({
        totalFeedback,
        analyzedCount,
        pendingCount,
        avgBiasScore,
        activeSources: sources?.length || 0,
        todayCount,
        regions: regions.size,
        recentActivity: recentItems
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
          <p className="mt-4 text-white font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
              India News Intelligence
            </h1>
            <p className="mt-2 text-blue-200 text-lg">Real-time bias detection and analysis</p>
          </div>

          {pulseCount > 0 && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-full px-6 py-3 flex items-center gap-2 animate-bounce">
              <div className="relative">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-ping absolute"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <span className="font-semibold text-green-300">{pulseCount} live updates</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
                <div className="text-3xl font-bold text-blue-300">{stats.totalFeedback}</div>
              </div>
              <div className="text-sm text-blue-200 font-medium">Total Articles</div>
              <div className="mt-2 text-xs text-blue-300/60">{stats.todayCount} collected today</div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Eye className="w-8 h-8 text-emerald-400" />
                <div className="text-3xl font-bold text-emerald-300">{stats.analyzedCount}</div>
              </div>
              <div className="text-sm text-emerald-200 font-medium">Analyzed</div>
              <div className="mt-2 text-xs text-emerald-300/60">
                {Math.round((stats.analyzedCount / (stats.totalFeedback || 1)) * 100)}% completion
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 hover:border-amber-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-amber-400" />
                <div className="text-3xl font-bold text-amber-300">{stats.avgBiasScore}%</div>
              </div>
              <div className="text-sm text-amber-200 font-medium">Average Bias</div>
              <div className="mt-2 h-2 bg-amber-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.avgBiasScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Radio className="w-8 h-8 text-purple-400" />
                <div className="text-3xl font-bold text-purple-300">{stats.activeSources}</div>
              </div>
              <div className="text-sm text-purple-200 font-medium">Active Sources</div>
              <div className="mt-2 text-xs text-purple-300/60">{stats.regions} regions covered</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-400" />
              Analysis Progress
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Analyzed Articles</span>
                  <span className="text-sm font-semibold text-emerald-400">{stats.analyzedCount}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.analyzedCount / (stats.totalFeedback || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Pending Analysis</span>
                  <span className="text-sm font-semibold text-amber-400">{stats.pendingCount}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.pendingCount / (stats.totalFeedback || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/50">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <div className="text-2xl font-bold text-blue-400">{stats.todayCount}</div>
                    <div className="text-xs text-blue-300/60 mt-1">Today</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 hover:border-purple-400/40 transition-all">
                    <Radio className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <div className="text-2xl font-bold text-purple-400">{stats.regions}</div>
                    <div className="text-xs text-purple-300/60 mt-1">Regions</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-400/40 transition-all">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                    <div className="text-2xl font-bold text-emerald-400">{stats.activeSources}</div>
                    <div className="text-xs text-emerald-300/60 mt-1">Sources</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Live Activity
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'analysis' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
}
