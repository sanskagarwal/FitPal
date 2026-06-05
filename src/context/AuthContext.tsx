import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile, UserGoals } from '../types';
import { saveUser, authLogin, authRegister, authLogout, authMe, authResetPassword } from '../utils/db';
import { calculateDailyCalories, calculateMacros, calculateAge } from '../utils/helpers';

// Distinguish a normal failed login from a legacy (pre-bcrypt) account that
// must set a new password once before it can sign in.
export type LoginResult = 'ok' | 'invalid' | 'legacy';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string, profile: UserProfile) => Promise<User | null>;
  resetPassword: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateGoals: (goals: Partial<UserGoals>) => Promise<void>;
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
    if (result.status === 409 && result.code === 'legacy_password') {
      return 'legacy';
    }
    return 'invalid';
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    profile: UserProfile
  ): Promise<User | null> => {
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
      return result.user;
    }
    return null;
  };

  const resetPassword = async (email: string, password: string): Promise<boolean> => {
    const result = await authResetPassword(email, password);
    if (result.ok && result.user) {
      setUser(result.user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        resetPassword,
        logout,
        updateProfile,
        updateGoals,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
