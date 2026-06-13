import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, UtensilsCrossed, Scale, Target, BookOpen, LogOut, UserCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'log-food', label: 'Log Food', icon: UtensilsCrossed },
    { id: 'weight', label: 'Weight', icon: Scale },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'recipes', label: 'Recipes', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 pt-safe px-safe">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <h1 className="text-xl font-bold text-primary-600">FitPal</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                    currentPage === item.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <button
              onClick={() => onNavigate('profile')}
              className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                currentPage === 'profile'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              title="View profile"
            >
              <UserCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{user?.name}</span>
            </button>
            <button
              onClick={logout}
              className="hidden md:flex items-center gap-2 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 mt-12 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>FitPal - Track Indian meals smartly & privately</p>
          <p className="mt-1">All data stored locally on your device</p>
        </div>
      </footer>

      {/* Mobile bottom navigation (replaces the hamburger menu on small screens) */}
      <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  );
};
