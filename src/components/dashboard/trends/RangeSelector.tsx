import { TrendRange } from './useTrendsData';

const OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 'all', label: 'All' },
];

interface RangeSelectorProps {
  range: TrendRange;
  onChange: (range: TrendRange) => void;
}

// Segmented control for the trend window (7 / 30 / 90 days / All). Shared by the
// dashboard trends section and the weight tracker chart.
export const RangeSelector = ({ range, onChange }: RangeSelectorProps) => (
  <div
    role="tablist"
    aria-label="Trend range"
    className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700/50"
  >
    {OPTIONS.map((opt) => {
      const active = opt.value === range;
      return (
        <button
          key={String(opt.value)}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
            active
              ? 'bg-white text-primary-600 shadow-sm dark:bg-gray-800 dark:text-primary-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
