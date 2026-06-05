import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getWeightsByUser } from '../../utils/db';
import { DietPreference, Gender, ActivityLevel } from '../../types';

export type ProfileFormData = {
  name: string;
  email: string;
  dateOfBirth: string;
  gender: Gender;
  height: number;
  activityLevel: ActivityLevel;
  dietPreference: DietPreference;
};

// Owns the Profile form state and the profile update flow. Wraps the existing
// AuthContext + db calls only.
export const useProfileForm = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    dateOfBirth: user?.profile.dateOfBirth || '',
    gender: user?.profile.gender || Gender.Male,
    height: user?.profile.height || 0,
    activityLevel: user?.profile.activityLevel || ActivityLevel.Moderate,
    dietPreference: user?.profile.dietPreference || DietPreference.Vegetarian,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getWeightsByUser(user.id).then((weights) => {
      if (weights.length > 0) {
        setCurrentWeight(weights[0].weight);
      }
    });
  }, [user]);

  const updateField = <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateProfile({
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender as Gender,
        height: formData.height,
        activityLevel: formData.activityLevel as ActivityLevel,
        dietPreference: formData.dietPreference as DietPreference,
        goals: user!.profile.goals, // Keep existing goals
      });
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { formData, updateField, loading, message, currentWeight, handleSubmit };
};
