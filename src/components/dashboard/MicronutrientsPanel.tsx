import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

// How many tiles to show before the "View all" toggle expands the rest. The
// first four are the most commonly watched micros.
const DEFAULT_VISIBLE_COUNT = 4;

export const MicronutrientsPanel = ({
  micronutrients,
  goals,
  suggestingNutrient,
  onNutrientSuggestion,
  isToday,
  selectedDate,
}: MicronutrientsPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  // Each row: current value source, target with default, and colour accent.
  // Ordered so the first four (Fiber, Iron, Calcium, Vitamin D) show by default.
  const cards: {
    label: string;
    benefit: string;
    value: number;
    unit: string;
    target: number;
    barClassName: string;
    valueClassName: string;
    suggestName: string;
  }[] = [
    {
      label: 'Fiber', benefit: 'Gut health & digestion', value: micronutrients.fiber || 0, unit: 'g', target: goals?.targetFiber || 30,
      barClassName: 'bg-purple-500', valueClassName: 'text-purple-600 dark:text-purple-300', suggestName: 'Fiber',
    },
    {
      label: 'Iron', benefit: 'Oxygen transport', value: micronutrients.iron || 0, unit: 'mg', target: goals?.targetIron || 18,
      barClassName: 'bg-red-500', valueClassName: 'text-red-600 dark:text-red-300', suggestName: 'Iron',
    },
    {
      label: 'Calcium', benefit: 'Bone & muscle health', value: micronutrients.calcium || 0, unit: 'mg', target: goals?.targetCalcium || 1000,
      barClassName: 'bg-blue-500', valueClassName: 'text-blue-600 dark:text-blue-300', suggestName: 'Calcium',
    },
    {
      label: 'Vitamin D', benefit: 'Immunity & bone strength', value: micronutrients.vitaminD || 0, unit: 'mcg', target: goals?.targetVitaminD || 15,
      barClassName: 'bg-yellow-500', valueClassName: 'text-yellow-700 dark:text-yellow-300', suggestName: 'Vitamin D',
    },
    {
      label: 'Vitamin A', benefit: 'Vision & skin repair', value: micronutrients.vitaminA || 0, unit: 'mcg', target: goals?.targetVitaminA || 900,
      barClassName: 'bg-orange-500', valueClassName: 'text-orange-600 dark:text-orange-300', suggestName: 'Vitamin A',
    },
    {
      label: 'Vitamin C', benefit: 'Immune defense & collagen', value: micronutrients.vitaminC || 0, unit: 'mg', target: goals?.targetVitaminC || 90,
      barClassName: 'bg-green-500', valueClassName: 'text-green-600 dark:text-green-300', suggestName: 'Vitamin C',
    },
    {
      label: 'Magnesium', benefit: 'Sleep & recovery', value: micronutrients.magnesium || 0, unit: 'mg', target: goals?.targetMagnesium || 400,
      barClassName: 'bg-indigo-500', valueClassName: 'text-indigo-600 dark:text-indigo-300', suggestName: 'Magnesium',
    },
    {
      label: 'Potassium', benefit: 'Heart & blood pressure', value: micronutrients.potassium || 0, unit: 'mg', target: goals?.targetPotassium || 3500,
      barClassName: 'bg-pink-500', valueClassName: 'text-pink-600 dark:text-pink-300', suggestName: 'Potassium',
    },
  ];

  const visibleCards = expanded ? cards : cards.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCount = cards.length - DEFAULT_VISIBLE_COUNT;

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">{isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`} Micronutrients</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {visibleCards.map((c) => (
          <MicronutrientCard
            key={c.label}
            label={c.label}
            benefit={c.benefit}
            value={c.value}
            unit={c.unit}
            target={c.target}
            barClassName={c.barClassName}
            valueClassName={c.valueClassName}
            suggestDisabled={suggestingNutrient}
            onSuggest={() => onNutrientSuggestion(c.suggestName, c.value, c.target)}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-100 min-h-11"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              View all {cards.length} <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
