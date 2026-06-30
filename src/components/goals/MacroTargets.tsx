import { GoalsFormData } from './useGoalsForm';

interface MacroTargetsProps {
  formData: GoalsFormData;
  updateField: (field: keyof GoalsFormData, value: number) => void;
}

export const MacroTargets = ({ formData, updateField }: MacroTargetsProps) => {
  return (
    <>
      {/* Calorie Goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Daily Calories Target
        </label>
        <input
          type="number"
          inputMode="numeric"
          min="800"
          max="6000"
          value={formData.targetCalories}
          onChange={(e) => updateField('targetCalories', parseInt(e.target.value))}
          className="input-field"
          required
        />
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Recommended: 1800-2500 for most adults</p>
      </div>

      {/* Daily Water Goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Daily Water Goal (cups)
        </label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="30"
          value={formData.targetWaterCups}
          onChange={(e) => updateField('targetWaterCups', parseInt(e.target.value))}
          className="input-field"
        />
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Recommended: 8 cups (about 2 litres) per day</p>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Protein (grams/day)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="500"
            value={formData.targetProtein}
            onChange={(e) => updateField('targetProtein', parseInt(e.target.value))}
            className="input-field"
            required
          />
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Builds muscle</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Carbs (grams/day)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            value={formData.targetCarbs}
            onChange={(e) => updateField('targetCarbs', parseInt(e.target.value))}
            className="input-field"
            required
          />
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Energy source</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Fats (grams/day)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="500"
            value={formData.targetFats}
            onChange={(e) => updateField('targetFats', parseInt(e.target.value))}
            className="input-field"
            required
          />
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Essential nutrients</p>
        </div>
      </div>
    </>
  );
};
