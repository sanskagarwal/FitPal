import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FoodLogger } from './components/FoodLogger';
import { WeightTracker } from './components/WeightTracker';
import { Goals } from './components/Goals';
import { Recipes } from './components/Recipes';
import { Profile } from './components/Profile';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'log-food':
        return <FoodLogger />;
      case 'weight':
        return <WeightTracker />;
      case 'goals':
        return <Goals />;
      case 'recipes':
        return <Recipes />;
      case 'profile':
        return <Profile />;
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
