import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Ruler, Calendar, Activity, Users, Salad, Scale } from 'lucide-react';
import { calculateAge, calculateBMI } from '../utils/helpers';
import { getWeightsByUser } from '../utils/db';
import { DietPreference, Gender, ActivityLevel } from '../types';

export const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
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
        goals: user!.profile.goals // Keep existing goals
      });
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <p className="text-sm text-gray-600">Update your personal details and metrics</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                disabled
                className="input-field bg-gray-100"
                title="Name cannot be changed"
              />
              <p className="text-xs text-gray-500 mt-1">Name cannot be edited</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="input-field bg-gray-100"
                title="Email cannot be changed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be edited</p>
            </div>
          </div>

          {/* Physical Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="input-field"
                required
              />
              {formData.dateOfBirth && (
                <p className="text-xs text-gray-500 mt-1">
                  Age: {calculateAge(formData.dateOfBirth)} years
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                className="input-field"
                required
                min="100"
                max="250"
                step="1"
              />
            </div>
          </div>

          {/* Current Weight (read-only — managed in the Weight Tracker) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Current Weight (kg)
            </label>
            <input
              type="text"
              value={currentWeight !== null ? `${currentWeight} kg` : 'No weight logged yet'}
              disabled
              className="input-field bg-gray-100"
              title="Update your weight in the Weight Tracker"
            />
            <p className="text-xs text-gray-500 mt-1">
              {currentWeight !== null && formData.height > 0
                ? `BMI: ${calculateBMI(currentWeight, formData.height)} — update weight in the Weight Tracker`
                : 'Log your weight in the Weight Tracker'}
            </p>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Level
            </label>
            <select
              value={formData.activityLevel}
              onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
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
            <p className="text-xs text-gray-600 mt-1">
              This affects your daily calorie calculations
            </p>
          </div>

          {/* Diet Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Salad className="w-4 h-4" />
              Dietary Preference
            </label>
            <select
              value={formData.dietPreference}
              onChange={(e) => setFormData({ ...formData, dietPreference: e.target.value as DietPreference })}
              className="input-field"
              aria-label="Dietary preference"
              required
            >
              <option value={DietPreference.Vegetarian}>Vegetarian (no meat, fish, or eggs)</option>
              <option value={DietPreference.Eggetarian}>Eggetarian (vegetarian + eggs)</option>
              <option value={DietPreference.NonVegetarian}>Non-vegetarian (meat, fish, eggs)</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Used for AI meal and recipe suggestions
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
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
      </div>

      {/* Info Card */}
      <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
        <h3 className="font-semibold mb-3 text-blue-900">ℹ️ About Your Data</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• All your data is stored securely on the server</li>
          <li>• Data is saved in JSON files on machine (server/data/ directory)</li>
          <li>• Your privacy is completely protected - no external cloud services</li>
          <li>• Back up the server/data/ folder regularly to prevent data loss</li>
          <li>• Changes to height, weight, age, and activity level affect goal calculations</li>
        </ul>
      </div>
    </div>
  );
};
