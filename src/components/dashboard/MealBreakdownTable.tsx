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

// A macro consumed below this share of its per-meal target is flagged as a
// shortfall on a logged meal.
const SHORTFALL_THRESHOLD = 0.6;

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

// Colour the macro chip by how the consumed amount compares to its target:
// on track (green), over (amber), or still under (neutral).
const macroChipTone = (value: number, target: number) => {
  if (target <= 0) return 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
  const ratio = value / target;
  if (ratio > 1.1) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
  if (ratio >= 0.85) return 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200';
  return 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
};

interface MacroChipProps {
  label: string;
  value: number;
  target: number;
  barClassName: string;
}

const MacroChip = ({ label, value, target, barClassName }: MacroChipProps) => (
  <div className={`rounded-lg px-2 py-1.5 ${macroChipTone(value, target)}`}>
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs tabular-nums">
        {Math.round(value)}
        <span className="text-gray-500 dark:text-gray-400">/{Math.round(target)}g</span>
      </span>
    </div>
    <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-1 rounded-full transition-all ${barClassName}`}
        style={{ width: `${pct(value, target)}%` }}
      />
    </div>
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

  // On a logged meal, flag macros that fell well short of their target.
  const shortfalls = stat.isLogged
    ? (
        [
          ['protein', stat.protein, target.protein],
          ['fiber', stat.fiber, target.fiber],
          ['carbs', stat.carbs, target.carbs],
          ['fats', stat.fats, target.fats],
        ] as const
      )
        .filter(([, value, t]) => t > 0 && value < t * SHORTFALL_THRESHOLD)
        .map(([name]) => name)
    : [];

  return (
    <motion.div
      variants={cardItem}
      className={`p-4 rounded-lg border ${
        stat.isLogged
          ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
          : 'bg-gray-50/60 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className={`w-5 h-5 shrink-0 ${
              stat.isLogged ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          />
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{label}</h3>
        </div>
        {stat.isLogged ? (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
            {Math.round(stat.calories)}
            <span className="text-gray-500 dark:text-gray-400 font-normal"> / {target.calories} kcal</span>
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Target {target.calories} kcal
          </span>
        )}
      </div>

      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all ${calorieOver ? 'bg-amber-500' : 'bg-primary-600'}`}
          style={{ width: `${caloriePct}%` }}
        />
      </div>

      {stat.isLogged ? (
        <>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MacroChip label="Protein" value={stat.protein} target={target.protein} barClassName="bg-red-500" />
            <MacroChip label="Carbs" value={stat.carbs} target={target.carbs} barClassName="bg-blue-500" />
            <MacroChip label="Fats" value={stat.fats} target={target.fats} barClassName="bg-amber-500" />
            <MacroChip label="Fiber" value={stat.fiber} target={target.fiber} barClassName="bg-purple-500" />
          </div>
          {shortfalls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shortfalls.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200 capitalize"
                >
                  Low {name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
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
            <div className="mt-2">
              <LoadingBlock label="Reviewing this meal..." />
            </div>
          )}

          {insight && !loading && isInsightOpen && (
            <div className="mt-2 rounded-lg border border-primary-100 dark:border-primary-900/40 bg-white dark:bg-gray-800 p-3 space-y-3">
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
        </>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Not logged yet</p>
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
      <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
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
