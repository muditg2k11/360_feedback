import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FeedbackCollection from './pages/FeedbackCollection';
import AIAnalysis from './pages/AIAnalysis';
import BiasDetection from './pages/BiasDetection';
import RegionalAnalytics from './pages/RegionalAnalytics';
import Reports from './pages/Reports';
import MediaSources from './pages/MediaSources';
import UserManagement from './pages/UserManagement';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSignUp, setShowSignUp] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showSignUp ? (
      <SignUpPage onSwitchToLogin={() => setShowSignUp(false)} />
    ) : (
      <LoginPage onSwitchToSignUp={() => setShowSignUp(true)} />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'feedback':
        return <FeedbackCollection />;
      case 'analysis':
        return <AIAnalysis />;
      case 'bias':
        return <BiasDetection />;
      case 'regional':
        return <RegionalAnalytics />;
      case 'reports':
        return <Reports />;
      case 'sources':
        return <MediaSources />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
