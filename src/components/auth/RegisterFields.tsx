import { Gender, ActivityLevel } from '../../types';
import { AuthFormData } from './useAuthForm';

interface RegisterFieldsProps {
  formData: AuthFormData;
  updateField: <K extends keyof AuthFormData>(field: K, value: AuthFormData[K]) => void;
}

// The registration-only fields (date of birth, gender, height, weight, activity).
export const RegisterFields = ({ formData, updateField }: RegisterFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date of Birth</label>
          <input
            type="date"
            placeholder="Date of Birth"
            value={formData.dateOfBirth}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</label>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="number"
          min="100"
          max="250"
          step="1"
          placeholder="Height (cm)"
          value={formData.height}
          onChange={(e) => updateField('height', e.target.value)}
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
          onChange={(e) => updateField('currentWeight', e.target.value)}
          className="input-field"
          required
        />
      </div>

      <select
        value={formData.activityLevel}
        onChange={(e) => updateField('activityLevel', e.target.value as ActivityLevel)}
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
  );
};
