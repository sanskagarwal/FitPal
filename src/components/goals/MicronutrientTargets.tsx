import { GoalsFormData } from './useGoalsForm';

interface MicronutrientTargetsProps {
  formData: GoalsFormData;
  updateField: (field: keyof GoalsFormData, value: number) => void;
}

const FIELDS: { field: keyof GoalsFormData; label: string }[] = [
  { field: 'targetFiber', label: 'Fiber (g)' },
  { field: 'targetVitaminA', label: 'Vitamin A (mcg)' },
  { field: 'targetVitaminC', label: 'Vitamin C (mg)' },
  { field: 'targetVitaminD', label: 'Vitamin D (mcg)' },
  { field: 'targetCalcium', label: 'Calcium (mg)' },
  { field: 'targetIron', label: 'Iron (mg)' },
  { field: 'targetMagnesium', label: 'Magnesium (mg)' },
  { field: 'targetPotassium', label: 'Potassium (mg)' },
];

export const MicronutrientTargets = ({ formData, updateField }: MicronutrientTargetsProps) => {
  return (
    <div>
      <h3 className="font-semibold mb-3">Micronutrient Targets</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {FIELDS.map(({ field, label }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="number"
              min="0"
              value={formData[field]}
              onChange={(e) => updateField(field, parseInt(e.target.value))}
              className="input-field text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
