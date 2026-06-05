import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile, UserGoals } from '../types';
import { saveUser, getUser, getUserByEmail } from '../utils/db';
import { hashPassword, verifyPassword, generateId, calculateDailyCalories, calculateMacros, calculateAge } from '../utils/helpers';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, profile: UserProfile) => Promise<boolean>;
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
    // Check for stored user session
    const loadUser = async () => {
      const storedUserId = localStorage.getItem('fitpal-user-id');
      if (storedUserId) {
        const loadedUser = await getUser(storedUserId);
        if (loadedUser) {
          setUser(loadedUser);
        } else {
          localStorage.removeItem('fitpal-user-id');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await getUserByEmail(email);
      if (!user) {
        return false;
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return false;
      }

      setUser(user);
      localStorage.setItem('fitpal-user-id', user.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    profile: UserProfile
  ): Promise<boolean> => {
    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return false;
      }

      const hashedPassword = await hashPassword(password);
      
      // Calculate recommended goals based on profile
      const dailyCalories = calculateDailyCalories(
        profile.goals.targetWeight,
        profile.height,
        calculateAge(profile.dateOfBirth),
        profile.gender,
        profile.activityLevel
      );
      
      const macros = calculateMacros(dailyCalories);

      const newUser: User = {
        id: generateId(),
        name,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        profile: {
          ...profile,
          goals: {
            ...profile.goals,
            targetCalories: profile.goals.targetCalories || dailyCalories,
            targetProtein: profile.goals.targetProtein || macros.protein,
            targetCarbs: profile.goals.targetCarbs || macros.carbs,
            targetFats: profile.goals.targetFats || macros.fats,
          }
        },
      };

      await saveUser(newUser);
      setUser(newUser);
      localStorage.setItem('fitpal-user-id', newUser.id);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fitpal-user-id');
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
        logout,
        updateProfile,
        updateGoals,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
