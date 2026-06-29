import { motion } from 'motion/react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { DailyStats, UserGoals } from '../../types';
import { getDayStatus, type DayStatusTone } from '../../utils/dayStatus';
import { useTheme } from '../../context/ThemeContext';

interface DaySummaryHeroProps {
  todayStats: DailyStats | null;
  goals?: UserGoals;
  onLogMeal?: () => void;
}

// Macro accent colors, matching the rest of the dashboard.
const MACRO_COLORS = {
  protein: { bar: 'bg-red-500' },
  carbs: { bar: 'bg-blue-500' },
  fats: { bar: 'bg-amber-500' },
} as const;

const STATUS_TONE_CLASSES: Record<DayStatusTone, string> = {
  start: 'text-blue-700 dark:text-blue-300',
  onTrack: 'text-green-700 dark:text-green-300',
  reached: 'text-amber-700 dark:text-amber-300',
  over: 'text-red-700 dark:text-red-300',
};

// Ring color follows the calorie status: primary while there's room, amber once
// the goal is reached, red when well over.
const ringColor = (percent: number) => {
  if (percent > 120) return '#ef4444'; // red-500
  if (percent > 100) return '#f59e0b'; // amber-500
  return '#059669'; // primary-600
};

// One macro pill: "Protein 80 / 150g", tinted by how it compares to its target.
const pillTone = (value: number, target: number) => {
  if (target <= 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
  const ratio = value / target;
  if (ratio > 1.1) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
  if (ratio >= 0.85) return 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
};

interface MacroPillProps {
  label: string;
  value: number;
  target: number;
  dotClassName: string;
}

const MacroPill = ({ label, value, target, dotClassName }: MacroPillProps) => (
  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${pillTone(value, target)}`}>
    <span className={`w-2 h-2 rounded-full ${dotClassName}`} />
    <span className="text-sm font-medium">{label}</span>
    <span className="text-sm tabular-nums">
      {Math.round(value)}
      <span className="opacity-80"> / {Math.round(target)}g</span>
    </span>
  </div>
);

// "Day at a glance" hero: a calorie ring with the remaining-for-the-day figure,
// the day's status line, and compact protein/carbs/fats pills. Replaces the old
// four-card overview and the motivational banner.
export const DaySummaryHero = ({ todayStats, goals, onLogMeal }: DaySummaryHeroProps) => {
  const { isDark } = useTheme();

  const consumed = Math.round(todayStats?.totalCalories || 0);
  const target = goals?.targetCalories || 2000;
  const percent = target > 0 ? (consumed / target) * 100 : 0;
  const remaining = target - consumed;
  const status = getDayStatus(todayStats, target);

  const chartData = [{ name: 'calories', value: consumed }];

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        {/* Calorie ring */}
        <div className="relative w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="78%"
              outerRadius="100%"
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, target]} tick={false} axisLine={false} />
              <RadialBar
                background={{ fill: isDark ? '#374151' : '#e5e7eb' }}
                dataKey="value"
                cornerRadius={999}
                fill={ringColor(percent)}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
              {consumed}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {target} kcal</span>
            <span
              className={`text-xs font-medium mt-1 ${
                remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
            </span>
          </div>
        </div>

        {/* Status + macro pills */}
        <div className="flex-1 w-full text-center sm:text-left">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {todayStats?.mealsLogged ? "Today's summary" : 'No meals logged yet'}
          </h2>
          {status && (
            <p className={`mt-1 text-sm font-medium ${STATUS_TONE_CLASSES[status.tone]}`}>
              {status.message}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <MacroPill
              label="Protein"
              value={todayStats?.totalProtein || 0}
              target={goals?.targetProtein || 150}
              dotClassName={MACRO_COLORS.protein.bar}
            />
            <MacroPill
              label="Carbs"
              value={todayStats?.totalCarbs || 0}
              target={goals?.targetCarbs || 250}
              dotClassName={MACRO_COLORS.carbs.bar}
            />
            <MacroPill
              label="Fats"
              value={todayStats?.totalFats || 0}
              target={goals?.targetFats || 65}
              dotClassName={MACRO_COLORS.fats.bar}
            />
          </div>
          {!todayStats?.mealsLogged && onLogMeal && (
            <button
              onClick={onLogMeal}
              className="mt-5 btn-primary w-full sm:w-auto"
            >
              Log your first meal
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
