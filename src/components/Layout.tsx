import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  Radio,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCircle,
  Youtube,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
    { name: 'Feedback Collection', icon: FileText, page: 'feedback' },
    { name: 'AI Analysis', icon: TrendingUp, page: 'analysis' },
    { name: 'Bias Detection', icon: AlertTriangle, page: 'bias' },
    { name: 'Regional Analytics', icon: BarChart3, page: 'regional' },
    { name: 'Reports', icon: FileText, page: 'reports' },
    { name: 'Media Sources', icon: Radio, page: 'sources' },
    { name: 'YouTube Monitoring', icon: Youtube, page: 'youtube' },
    { name: 'Departments', icon: Building2, page: 'departments' },
    { name: 'PIB Officers', icon: UserCircle, page: 'officers' },
    { name: 'User Management', icon: Users, page: 'users', adminOnly: true },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">360° Feedback</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">360° Feedback</h1>
                <p className="text-xs text-gray-500">Government of India</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onNavigate(item.page);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-700">
                  {user?.full_name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
