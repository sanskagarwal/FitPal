import { Lightbulb } from 'lucide-react';

interface MicronutrientCardProps {
  label: string;
  value: number;
  unit: string;
  target: number;
  bgClassName: string;
  valueClassName: string;
  onSuggest: () => void;
  suggestDisabled?: boolean;
}

// One micronutrient tile (value, target, and a "Suggest" action). Replaces the
// eight near-identical blocks the Dashboard previously inlined.
export const MicronutrientCard = ({
  label,
  value,
  unit,
  target,
  bgClassName,
  valueClassName,
  onSuggest,
  suggestDisabled,
}: MicronutrientCardProps) => {
  return (
    <div className={`p-3 ${bgClassName} rounded-lg`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-xl font-bold ${valueClassName}`}>{Math.round(value)}{unit}</p>
      <p className="text-xs text-gray-500">Target: {target}{unit}</p>
      <button
        onClick={onSuggest}
        disabled={suggestDisabled}
        className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <Lightbulb className="w-3 h-3" />
        Suggest
      </button>
    </div>
  );
};
