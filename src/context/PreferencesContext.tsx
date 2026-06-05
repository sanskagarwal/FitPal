import { createContext, useContext, ReactNode } from 'react';
import { User, UserProfile, UserGoals } from '../types';
import { saveUser } from '../utils/db';
import { useAuth } from './AuthContext';

// User-preferences concerns: updating the signed-in user's profile and goals.
// Split out from AuthContext so authentication and preference management stay
// independent. Persists via the users API and refreshes the cached auth user.
interface PreferencesContextType {
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateGoals: (goals: Partial<UserGoals>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const { user, setUser } = useAuth();

  const updateProfile = async (profileUpdate: Partial<UserProfile>) => {
    if (!user) return;

    const updatedUser: User = {
      ...user,
      profile: {
        ...user.profile,
        ...profileUpdate,
      },
    };

    await saveUser(updatedUser);
    setUser(updatedUser);
  };

  const updateGoals = async (goalsUpdate: Partial<UserGoals>) => {
    if (!user) return;

    const updatedUser: User = {
      ...user,
      profile: {
        ...user.profile,
        goals: {
          ...user.profile.goals,
          ...goalsUpdate,
        },
      },
    };

    await saveUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <PreferencesContext.Provider value={{ updateProfile, updateGoals }}>
      {children}
    </PreferencesContext.Provider>
  );
};
