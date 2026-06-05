import { NutrientInfo, UserGoals } from '../../types';
import { formatDayLabel } from '../../utils/helpers';
import { MicronutrientCard } from './MicronutrientCard';

interface MicronutrientsPanelProps {
  micronutrients: Partial<NutrientInfo>;
  goals?: UserGoals;
  suggestingNutrient: boolean;
  onNutrientSuggestion: (nutrientName: string, currentAmount: number, targetAmount: number) => void;
  isToday: boolean;
  selectedDate: Date;
}

export const MicronutrientsPanel = ({
  micronutrients,
  goals,
  suggestingNutrient,
  onNutrientSuggestion,
  isToday,
  selectedDate,
}: MicronutrientsPanelProps) => {
  // Each tile: current value source, target with default, and colour theme.
  const cards: {
    label: string;
    value: number;
    unit: string;
    target: number;
    bgClassName: string;
    valueClassName: string;
    suggestName: string;
  }[] = [
    {
      label: 'Fiber', value: micronutrients.fiber || 0, unit: 'g', target: goals?.targetFiber || 30,
      bgClassName: 'bg-purple-50', valueClassName: 'text-purple-600', suggestName: 'Fiber',
    },
    {
      label: 'Vitamin A', value: micronutrients.vitaminA || 0, unit: 'mcg', target: goals?.targetVitaminA || 900,
      bgClassName: 'bg-orange-50', valueClassName: 'text-orange-600', suggestName: 'Vitamin A',
    },
    {
      label: 'Vitamin C', value: micronutrients.vitaminC || 0, unit: 'mg', target: goals?.targetVitaminC || 90,
      bgClassName: 'bg-green-50', valueClassName: 'text-green-600', suggestName: 'Vitamin C',
    },
    {
      label: 'Vitamin D', value: micronutrients.vitaminD || 0, unit: 'mcg', target: goals?.targetVitaminD || 15,
      bgClassName: 'bg-yellow-50', valueClassName: 'text-yellow-600', suggestName: 'Vitamin D',
    },
    {
      label: 'Calcium', value: micronutrients.calcium || 0, unit: 'mg', target: goals?.targetCalcium || 1000,
      bgClassName: 'bg-blue-50', valueClassName: 'text-blue-600', suggestName: 'Calcium',
    },
    {
      label: 'Iron', value: micronutrients.iron || 0, unit: 'mg', target: goals?.targetIron || 18,
      bgClassName: 'bg-red-50', valueClassName: 'text-red-600', suggestName: 'Iron',
    },
    {
      label: 'Magnesium', value: micronutrients.magnesium || 0, unit: 'mg', target: goals?.targetMagnesium || 400,
      bgClassName: 'bg-indigo-50', valueClassName: 'text-indigo-600', suggestName: 'Magnesium',
    },
    {
      label: 'Potassium', value: micronutrients.potassium || 0, unit: 'mg', target: goals?.targetPotassium || 3500,
      bgClassName: 'bg-pink-50', valueClassName: 'text-pink-600', suggestName: 'Potassium',
    },
  ];

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">{isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`} Micronutrients</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <MicronutrientCard
            key={c.label}
            label={c.label}
            value={c.value}
            unit={c.unit}
            target={c.target}
            bgClassName={c.bgClassName}
            valueClassName={c.valueClassName}
            suggestDisabled={suggestingNutrient}
            onSuggest={() => onNutrientSuggestion(c.suggestName, c.value, c.target)}
          />
        ))}
      </div>
    </div>
  );
};
