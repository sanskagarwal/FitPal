import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Moon,
  Sparkles,
  Wand2,
  X,
  LucideIcon,
} from 'lucide-react';
import { DietPreference, MealInsight, MealTarget, MealType, UserGoals } from '../../types';
import { formatDayLabel, formatMealTypeLabel } from '../../utils/helpers';
import { getMealTargets } from '../../utils/goals';
import { getMealInsight } from '../../services/openai';
import { Spinner, LoadingBlock } from '../Spinner';
import { MealTypeStats } from './useDashboardData';

interface MealBreakdownTableProps {
  mealTypeStats: MealTypeStats[];
  goals?: UserGoals;
  dietPreference?: DietPreference;
  isToday: boolean;
  selectedDate: Date;
}

const MEAL_ICONS: Record<MealType, LucideIcon> = {
  [MealType.Breakfast]: Coffee,
  [MealType.MorningSnack]: Apple,
  [MealType.Lunch]: UtensilsCrossed,
  [MealType.EveningSnack]: Cookie,
  [MealType.Dinner]: Moon,
};

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const pct = (value: number, target: number) =>
  target > 0 ? Math.min((value / target) * 100, 100) : 0;

// Colour a macro value by how the consumed amount compares to its target:
// on track (green), over (amber), or still under (neutral).
const macroValueTone = (value: number, target: number) => {
  if (target <= 0) return 'text-gray-700 dark:text-gray-200';
  const ratio = value / target;
  if (ratio > 1.1) return 'text-amber-700 dark:text-amber-300';
  if (ratio >= 0.85) return 'text-green-700 dark:text-green-300';
  return 'text-gray-700 dark:text-gray-200';
};

interface MacroStatProps {
  label: string;
  value: number;
  target: number;
}

// A compact macro readout: label with a colored "value / target g". No bar -
// the colour conveys whether the macro is on track, over, or still short.
const MacroStat = ({ label, value, target }: MacroStatProps) => (
  <div className="flex items-baseline justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5">
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`text-sm tabular-nums font-semibold ${macroValueTone(value, target)}`}>
      {Math.round(value)}
      <span className="font-normal text-gray-400 dark:text-gray-500">/{Math.round(target)}g</span>
    </span>
  </div>
);

interface MealRowProps {
  stat: MealTypeStats;
  target: MealTarget;
  insight: MealInsight | null;
  loading: boolean;
  isInsightOpen: boolean;
  onGetInsight: () => void;
  onDismissInsight: () => void;
}

const MealRow = ({
  stat,
  target,
  insight,
  loading,
  isInsightOpen,
  onGetInsight,
  onDismissInsight,
}: MealRowProps) => {
  const Icon = MEAL_ICONS[stat.mealType];
  const label = formatMealTypeLabel(stat.mealType);
  const caloriePct = pct(stat.calories, target.calories);
  const calorieOver = target.calories > 0 && stat.calories > target.calories * 1.1;

  // Unlogged meals collapse to a single muted line with just their target.
  if (!stat.isLogged) {
    return (
      <motion.div variants={cardItem} className="flex items-center justify-between gap-2 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-5 h-5 shrink-0 text-gray-400 dark:text-gray-500" />
          <h3 className="font-medium text-gray-500 dark:text-gray-400 truncate">{label}</h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          Target {target.calories} kcal
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardItem} className="py-3">
      {/* Header: meal + calories vs target + slim calorie bar. */}
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{label}</h3>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
              {Math.round(stat.calories)}
              <span className="text-gray-500 dark:text-gray-400 font-normal"> / {target.calories} kcal</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-1.5 rounded-full transition-all ${calorieOver ? 'bg-amber-500' : 'bg-primary-600'}`}
              style={{ width: `${caloriePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Macros (always visible) as compact color-coded value/target columns. */}
      <div className="mt-2 pl-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MacroStat label="Protein" value={stat.protein} target={target.protein} />
        <MacroStat label="Carbs" value={stat.carbs} target={target.carbs} />
        <MacroStat label="Fats" value={stat.fats} target={target.fats} />
        <MacroStat label="Fiber" value={stat.fiber} target={target.fiber} />
      </div>

      {/* Insight action (always visible); result expands inline when fetched. */}
      <div className="mt-2 pl-8 flex items-center gap-3">
        <button
          onClick={onGetInsight}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-100 min-h-11 disabled:opacity-60"
        >
          {loading ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing...' : insight ? 'Refresh insight' : 'Get insight'}
        </button>
        {insight && !loading && isInsightOpen && (
          <button
            onClick={onDismissInsight}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Dismiss insight"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-2 pl-8">
          <LoadingBlock label="Reviewing this meal..." />
        </div>
      )}

      {insight && !loading && isInsightOpen && (
        <div className="mt-2 ml-8 rounded-lg border border-primary-100 dark:border-primary-900/40 bg-white dark:bg-gray-800 p-3 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">{insight.assessment}</p>

          {insight.shortfalls.length > 0 && (
            <ul className="space-y-1">
              {insight.shortfalls.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium capitalize text-gray-800 dark:text-gray-100">
                    {s.nutrient}:
                  </span>
                  <span>{s.note}</span>
                </li>
              ))}
            </ul>
          )}

          {insight.improveThisMeal.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Improve this meal
              </p>
              <ul className="space-y-1.5">
                {insight.improveThisMeal.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Wand2 className="w-4 h-4 mt-0.5 text-primary-600 dark:text-primary-400 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.makeUp.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Make it up later
              </p>
              <ul className="space-y-1.5">
                {insight.makeUp.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-200 capitalize shrink-0">
                      {formatMealTypeLabel(m.mealType)}
                    </span>
                    <span>{m.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const MealBreakdownTable = ({
  mealTypeStats,
  goals,
  dietPreference,
  isToday,
  selectedDate,
}: MealBreakdownTableProps) => {
  const [insights, setInsights] = useState<Partial<Record<MealType, MealInsight>>>({});
  const [openInsight, setOpenInsight] = useState<Partial<Record<MealType, boolean>>>({});
  const [loadingFor, setLoadingFor] = useState<MealType | null>(null);

  if (!goals || mealTypeStats.length === 0) return null;

  const handleGetInsight = async (stat: MealTypeStats, target: MealTarget, laterMealTypes: MealType[]) => {
    setLoadingFor(stat.mealType);
    try {
      const result = await getMealInsight(
        stat.mealType,
        {
          calories: Math.round(stat.calories),
          protein: Math.round(stat.protein),
          carbs: Math.round(stat.carbs),
          fats: Math.round(stat.fats),
          fiber: Math.round(stat.fiber),
        },
        target,
        laterMealTypes,
        dietPreference
      );
      setInsights((prev) => ({ ...prev, [stat.mealType]: result }));
      setOpenInsight((prev) => ({ ...prev, [stat.mealType]: true }));
    } catch (error) {
      console.error('Error getting meal insight:', error);
    } finally {
      setLoadingFor(null);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">
        {isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`} Meal Breakdown
      </h2>
      <motion.div
        className="divide-y divide-gray-100 dark:divide-gray-700"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {mealTypeStats.map((stat, index) => {
          const target = getMealTargets(stat.mealType, goals);
          const laterMealTypes = mealTypeStats.slice(index + 1).map((s) => s.mealType);
          return (
            <MealRow
              key={stat.mealType}
              stat={stat}
              target={target}
              insight={insights[stat.mealType] ?? null}
              loading={loadingFor === stat.mealType}
              isInsightOpen={!!openInsight[stat.mealType]}
              onGetInsight={() => handleGetInsight(stat, target, laterMealTypes)}
              onDismissInsight={() =>
                setOpenInsight((prev) => ({ ...prev, [stat.mealType]: false }))
              }
            />
          );
        })}
      </motion.div>
    </div>
  );
};
