import { User, Mail, Ruler, Calendar, Activity, Users, Salad, Scale } from 'lucide-react';
import { calculateAge, calculateBMI } from '../../utils/helpers';
import { DietPreference, Gender, ActivityLevel } from '../../types';
import { ProfileFormData } from './useProfileForm';

interface ProfileFormProps {
  formData: ProfileFormData;
  updateField: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  currentWeight: number | null;
  loading: boolean;
  message: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProfileForm = ({ formData, updateField, currentWeight, loading, message, onSubmit }: ProfileFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            disabled
            className="input-field bg-gray-100 dark:bg-gray-800"
            title="Name cannot be changed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Name cannot be edited</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="input-field bg-gray-100 dark:bg-gray-800"
            title="Email cannot be changed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be edited</p>
        </div>
      </div>

      {/* Physical Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="input-field"
            required
          />
          {formData.dateOfBirth && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Age: {calculateAge(formData.dateOfBirth)} years
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value as Gender)}
            className="input-field"
            aria-label="Gender"
            required
          >
            <option value={Gender.Male}>Male</option>
            <option value={Gender.Female}>Female</option>
            <option value={Gender.Other}>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Height (cm)
          </label>
          <input
            type="number"
            value={formData.height}
            onChange={(e) => updateField('height', parseInt(e.target.value))}
            className="input-field"
            required
            min="100"
            max="250"
            step="1"
          />
        </div>
      </div>

      {/* Current Weight (read-only - managed in the Weight Tracker) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Current Weight (kg)
        </label>
        <input
          type="text"
          value={currentWeight !== null ? `${currentWeight} kg` : 'No weight logged yet'}
          disabled
          className="input-field bg-gray-100 dark:bg-gray-800"
          title="Update your weight in the Weight Tracker"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {currentWeight !== null && formData.height > 0
            ? `BMI: ${calculateBMI(currentWeight, formData.height)} - update weight in the Weight Tracker`
            : 'Log your weight in the Weight Tracker'}
        </p>
      </div>

      {/* Activity Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Activity Level
        </label>
        <select
          value={formData.activityLevel}
          onChange={(e) => updateField('activityLevel', e.target.value as ActivityLevel)}
          className="input-field"
          aria-label="Activity level"
          required
        >
          <option value={ActivityLevel.Sedentary}>Sedentary (Little or no exercise)</option>
          <option value={ActivityLevel.Light}>Light (Exercise 1-3 days/week)</option>
          <option value={ActivityLevel.Moderate}>Moderate (Exercise 3-5 days/week)</option>
          <option value={ActivityLevel.Active}>Active (Exercise 6-7 days/week)</option>
          <option value={ActivityLevel.VeryActive}>Very Active (Intense exercise daily)</option>
        </select>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          This affects your daily calorie calculations
        </p>
      </div>

      {/* Diet Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
          <Salad className="w-4 h-4" />
          Dietary Preference
        </label>
        <select
          value={formData.dietPreference}
          onChange={(e) => updateField('dietPreference', e.target.value as DietPreference)}
          className="input-field"
          aria-label="Dietary preference"
          required
        >
          <option value={DietPreference.Vegetarian}>Vegetarian (no meat, fish, or eggs)</option>
          <option value={DietPreference.Eggetarian}>Eggetarian (vegetarian + eggs)</option>
          <option value={DietPreference.NonVegetarian}>Non-vegetarian (meat, fish, eggs)</option>
        </select>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          Used for AI meal and recipe suggestions
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('success') ? 'alert-success' : 'alert-error'
        }`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
};
