import { MealUnit } from '../../types';
import { QUANTITY_UNITS } from './foodLoggerUtils';

interface FoodQuantityInputProps {
  unitQuantity: number;
  unit: MealUnit;
  disabled?: boolean;
  name: string;
  onQuantityChange: (unitQuantity: number) => void;
  onUnitChange: (unit: MealUnit) => void;
}

// The quantity number input + unit selector pair used for each selected food.
export const FoodQuantityInput = ({
  unitQuantity,
  unit,
  disabled,
  name,
  onQuantityChange,
  onUnitChange,
}: FoodQuantityInputProps) => {
  return (
    <>
      <input
        type="number"
        min="0.25"
        step="0.25"
        value={unitQuantity}
        onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 1)}
        className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
        disabled={disabled}
        aria-label={`Quantity of ${name}`}
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as MealUnit)}
        className="flex-1 sm:flex-none px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm disabled:opacity-50"
        disabled={disabled}
        aria-label={`Unit for ${name}`}
      >
        {QUANTITY_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </>
  );
};
