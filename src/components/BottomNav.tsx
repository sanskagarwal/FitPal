import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Home, UtensilsCrossed, Scale, Target, BookOpen, LogOut, Menu, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useScrollDirection } from './useScrollDirection';
import { ThemeToggle } from './ThemeToggle';

const primaryItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/log-food', label: 'Log Food', icon: UtensilsCrossed },
  { path: '/weight', label: 'Weight', icon: Scale },
  { path: '/goals', label: 'Goals', icon: Target },
] as const;

const moreItems = [
  { path: '/recipes', label: 'Recipes', icon: BookOpen },
  { path: '/profile', label: 'Profile', icon: UserCircle },
] as const;

const moreItemPaths: string[] = [...moreItems.map((item) => item.path)];

/**
 * Mobile-only bottom navigation bar. Hides on scroll-down and reappears on scroll-up.
 */
export const BottomNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollDirection = useScrollDirection();
  const hidden = scrollDirection === 'down' && !moreOpen;

  const moreActive = moreOpen || moreItemPaths.includes(location.pathname);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path;

  const navTo = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
      active
        ? 'text-primary-600 dark:text-primary-300'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
    }`;

  return (
    <>
      {/* More sheet + backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="More options"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white px-safe pb-safe shadow-xl dark:border-gray-700 dark:bg-gray-800 md:hidden"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
              <nav className="space-y-1 p-4">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navTo(item.path)}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                        active
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.path === '/profile' ? user?.name || 'Profile' : item.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    logout();
                    setMoreOpen(false);
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
                  <ThemeToggle />
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <motion.nav
        aria-label="Primary"
        animate={{ y: hidden ? '120%' : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-safe pb-safe dark:border-gray-700 dark:bg-gray-800 md:hidden"
      >
        <div className="flex items-stretch gap-1 px-2 py-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.92 }}
                onClick={() => navTo(item.path)}
                aria-current={active ? 'page' : undefined}
                className={tabClass(active)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setMoreOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive && !moreOpen ? 'page' : undefined}
            className={tabClass(moreActive)}
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </motion.button>
        </div>
      </motion.nav>
    </>
  );
};
