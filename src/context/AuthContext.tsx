import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile } from '../types';
import { authLogin, authRegister, authLogout, authMe } from '../utils/db';
import { calculateDailyCalories, calculateMacros, calculateAge } from '../utils/helpers';

// Distinguish a successful login from a failed one.
export type LoginResult = 'ok' | 'invalid';

// Registration either succeeds with the created user, or fails with the
// server-provided reason (e.g. duplicate email, weak password) so the UI can
// show what actually went wrong instead of a generic message.
export type RegisterResult = { ok: true; user: User } | { ok: false; error: string };

// Auth-only concerns: who is signed in and how to change that. User
// preferences (profile/goals) live in PreferencesContext, which updates the
// cached user via `setUser`.
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string, profile: UserProfile) => Promise<RegisterResult>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore the session from the httpOnly auth cookie (validated server-side).
    const loadUser = async () => {
      const loadedUser = await authMe();
      if (loadedUser) {
        setUser(loadedUser);
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const result = await authLogin(email, password);
    if (result.ok && result.user) {
      setUser(result.user);
      return 'ok';
    }
    return 'invalid';
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    profile: UserProfile
  ): Promise<RegisterResult> => {
    // Fill in any goals the caller left unset using the standard estimates.
    const dailyCalories = calculateDailyCalories(
      profile.goals.targetWeight,
      profile.height,
      calculateAge(profile.dateOfBirth),
      profile.gender,
      profile.activityLevel
    );

    const macros = calculateMacros(dailyCalories);

    const finalProfile: UserProfile = {
      ...profile,
      goals: {
        ...profile.goals,
        targetCalories: profile.goals.targetCalories || dailyCalories,
        targetProtein: profile.goals.targetProtein || macros.protein,
        targetCarbs: profile.goals.targetCarbs || macros.carbs,
        targetFats: profile.goals.targetFats || macros.fats,
      },
    };

    const result = await authRegister({ name, email, password, profile: finalProfile });
    if (result.ok && result.user) {
      setUser(result.user);
      return { ok: true, user: result.user };
    }
    return { ok: false, error: result.error || 'Registration failed. Please try again.' };
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
