import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { DateProvider } from './context/DateContext';
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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Already-open-tab path: service worker posts a navigate message with a URL
    // so the existing tab transitions without a page reload.
    const handleMessage = (event: MessageEvent<{ type: string; url: string }>) => {
      if (event.data?.type === 'navigate' && typeof event.data.url === 'string') {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [navigate]);

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

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log-food" element={<FoodLogger />} />
            <Route path="/weight" element={<WeightTracker />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PreferencesProvider>
            <DateProvider>
              <AppContent />
            </DateProvider>
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
