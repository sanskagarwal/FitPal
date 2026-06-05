import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import { saveWeight } from '../utils/db';
import { generateId, calculateBMI, calculateAge, isValidEmail } from '../utils/helpers';
import { WeightEntry, Gender, ActivityLevel } from '../types';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: Gender.Male as Gender,
    height: '',
    currentWeight: '',
    activityLevel: ActivityLevel.Moderate as ActivityLevel,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

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
        const success = await login(formData.email, formData.password);
        if (!success) {
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

        // Calculate default maintenance calories based on BMR and activity level
        const age = calculateAge(formData.dateOfBirth);
        const height = parseInt(formData.height);
        const weight = parseInt(formData.currentWeight);
        
        // Mifflin-St Jeor Equation for BMR
        const bmr = formData.gender === Gender.Male 
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;
        
        // Activity multipliers
        const activityMultipliers: Record<ActivityLevel, number> = {
          [ActivityLevel.Sedentary]: 1.2,
          [ActivityLevel.Light]: 1.375,
          [ActivityLevel.Moderate]: 1.55,
          [ActivityLevel.Active]: 1.725,
          [ActivityLevel.VeryActive]: 1.9
        };
        
        const maintenanceCalories = Math.round(bmr * activityMultipliers[formData.activityLevel]);
        const protein = Math.round(weight * 1.6); // 1.6g per kg for active individuals
        const fats = Math.round((maintenanceCalories * 0.25) / 9); // 25% of calories from fats
        const carbs = Math.round((maintenanceCalories - (protein * 4) - (fats * 9)) / 4);

        const success = await register(formData.name, formData.email, formData.password, {
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

        // If registration successful, log initial weight
        if (success) {
          try {
            // Need to get the newly created user ID
            const newUser = await new Promise<any>((resolve) => {
              setTimeout(() => {
                // This is a workaround - the user state should be available after successful registration
                const storedUserId = localStorage.getItem('fitpal-user-id');
                resolve({ id: storedUserId });
              }, 100);
            });

            if (newUser?.id) {
              const initialWeight: WeightEntry = {
                id: generateId(),
                userId: newUser.id,
                date: new Date(),
                weight: weight,
                bmi: calculateBMI(weight, height),
                notes: 'Initial weight at registration',
              };
              await saveWeight(initialWeight);
            }
          } catch (error) {
            console.error('Error logging initial weight:', error);
          }
        }

        if (!success) {
          setError('Email already exists');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-start justify-center p-4 py-10 sm:py-16">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">🥗 FitPal</h1>
          <p className="text-gray-600">Track Indian meals smartly & privately</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isLogin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <LogIn className="inline w-4 h-4 mr-2" />
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isLogin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <UserPlus className="inline w-4 h-4 mr-2" />
            Register
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
          className="space-y-4"
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required={!isLogin}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input-field"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input-field"
            required
          />

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    placeholder="Date of Birth"
                    value={formData.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  min="100"
                  max="250"
                  step="1"
                  placeholder="Height (cm)"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  placeholder="Current Weight (kg)"
                  value={formData.currentWeight}
                  onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <select
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
                className="input-field"
                aria-label="Activity level"
                required
              >
                <option value={ActivityLevel.Sedentary}>Sedentary (little/no exercise)</option>
                <option value={ActivityLevel.Light}>Light (1-3 days/week)</option>
                <option value={ActivityLevel.Moderate}>Moderate (3-5 days/week)</option>
                <option value={ActivityLevel.Active}>Active (6-7 days/week)</option>
                <option value={ActivityLevel.VeryActive}>Very Active (twice per day)</option>
              </select>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
