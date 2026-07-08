import { Lightbulb } from 'lucide-react';

interface MicronutrientCardProps {
  label: string;
  benefit: string;
  value: number;
  unit: string;
  target: number;
  barClassName: string;
  valueClassName: string;
  onSuggest: () => void;
  suggestDisabled?: boolean;
}

// One compact micronutrient row: label, value/target, a thin progress bar, and
// an icon-only "Suggest foods" action. Replaces the taller tinted tile.
export const MicronutrientCard = ({
  label,
  benefit,
  value,
  unit,
  target,
  barClassName,
  valueClassName,
  onSuggest,
  suggestDisabled,
}: MicronutrientCardProps) => {
  const percent = target > 0 ? Math.min((value / target) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate block">{label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 italic truncate block">{benefit}</span>
          </div>
          <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300 shrink-0">
            <span className={`font-semibold ${valueClassName}`}>{Math.round(value)}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {' '}
              / {target}
              {unit}
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-1.5 rounded-full transition-all ${barClassName}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <button
        onClick={onSuggest}
        disabled={suggestDisabled}
        aria-label={`Suggest foods rich in ${label}`}
        title={`Suggest foods rich in ${label}`}
        className="shrink-0 flex items-center justify-center w-11 h-11 -my-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <Lightbulb className="w-4 h-4" />
      </button>
    </div>
  );
};
