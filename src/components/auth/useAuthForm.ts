import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveWeight } from '../../utils/db';
import { generateId, calculateBMI, calculateAge, isValidEmail } from '../../utils/helpers';
import { calculateRegistrationGoals } from '../../utils/goals';
import { WeightEntry, Gender, ActivityLevel } from '../../types';

export type AuthFormData = {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: Gender;
  height: string;
  currentWeight: string;
  activityLevel: ActivityLevel;
};

const INITIAL_FORM: AuthFormData = {
  name: '',
  email: '',
  password: '',
  dateOfBirth: '',
  gender: Gender.Male,
  height: '',
  currentWeight: '',
  activityLevel: ActivityLevel.Moderate,
};

// Owns the auth form state plus the login / register flows. Wraps the existing
// AuthContext + db calls only.
export const useAuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const updateField = <K extends keyof AuthFormData>(field: K, value: AuthFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!isValidEmail(formData.email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }
        const result = await login(formData.email, formData.password);
        if (result !== 'ok') {
          setError('Invalid email or password');
        }
      } else {
        if (!formData.name || !formData.email || !formData.password || !formData.dateOfBirth || !formData.height || !formData.currentWeight) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        if (!isValidEmail(formData.email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }

        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }

        // Calculate default maintenance calories based on BMR and activity level
        const age = calculateAge(formData.dateOfBirth);
        const height = parseInt(formData.height);
        const weight = parseInt(formData.currentWeight);

        const { maintenanceCalories, protein, carbs, fats } = calculateRegistrationGoals(
          formData.gender,
          height,
          weight,
          age,
          formData.activityLevel
        );

        const result = await register(formData.name, formData.email, formData.password, {
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          height: parseInt(formData.height),
          activityLevel: formData.activityLevel,
          goals: {
            targetWeight: 0, // Empty - user will set this in Goals page
            targetCalories: maintenanceCalories,
            targetProtein: protein,
            targetCarbs: carbs,
            targetFats: fats,
            targetFiber: 30,
          },
        });

        // If registration succeeded, log the user's initial weight using the
        // id returned from the server (no localStorage round-trip needed).
        if (result.ok) {
          try {
            const initialWeight: WeightEntry = {
              id: generateId(),
              userId: result.user.id,
              date: new Date(),
              weight: weight,
              bmi: calculateBMI(weight, height),
              notes: 'Initial weight at registration',
            };
            await saveWeight(initialWeight);
          } catch (error) {
            console.error('Error logging initial weight:', error);
          }
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    isLogin,
    formData,
    updateField,
    error,
    loading,
    switchMode,
    handleSubmit,
  };
};
