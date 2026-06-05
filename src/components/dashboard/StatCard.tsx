import { motion } from 'motion/react';
import { Lightbulb, type LucideIcon } from 'lucide-react';

const statCardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  targetLabel: string;
  Icon: LucideIcon;
  iconClassName: string;
  barClassName: string;
  percentage: number;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
}

// A single overview macro card with a progress bar and optional "Suggest Foods"
// action. Used for Calories / Protein / Carbs / Fats.
export const StatCard = ({
  label,
  value,
  targetLabel,
  Icon,
  iconClassName,
  barClassName,
  percentage,
  onSuggest,
  suggestDisabled,
}: StatCardProps) => {
  return (
    <motion.div className="stat-card" variants={statCardItem}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-700 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-600">{targetLabel}</p>
        </div>
        <Icon className={`w-10 h-10 ${iconClassName}`} />
      </div>
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className={`${barClassName} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      {onSuggest && (
        <button
          onClick={onSuggest}
          disabled={suggestDisabled}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Lightbulb className="w-3 h-3" />
          Suggest Foods
        </button>
      )}
    </motion.div>
  );
};
