import { motion } from 'motion/react';
import { Flame, Drumstick, Wheat, Droplet } from 'lucide-react';
import { DailyStats, UserGoals } from '../../types';
import { formatNutrient, getGoalPercentage } from '../../utils/helpers';
import { StatCard } from './StatCard';

const statsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

interface OverviewStatsProps {
  todayStats: DailyStats | null;
  goals?: UserGoals;
  suggestingNutrient: boolean;
  onNutrientSuggestion: (nutrientName: string, currentAmount: number, targetAmount: number) => void;
}

// The four-up macro overview (Calories / Protein / Carbs / Fats).
export const OverviewStats = ({
  todayStats,
  goals,
  suggestingNutrient,
  onNutrientSuggestion,
}: OverviewStatsProps) => {
  const caloriePercentage = todayStats ? getGoalPercentage(todayStats.totalCalories, goals?.targetCalories || 2000) : 0;
  const proteinPercentage = todayStats ? getGoalPercentage(todayStats.totalProtein, goals?.targetProtein || 150) : 0;
  const carbsPercentage = todayStats ? getGoalPercentage(todayStats.totalCarbs, goals?.targetCarbs || 250) : 0;
  const fatsPercentage = todayStats ? getGoalPercentage(todayStats.totalFats, goals?.targetFats || 65) : 0;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={statsContainer}
      initial="hidden"
      animate="show"
    >
      <StatCard
        label="Calories"
        value={todayStats?.totalCalories || 0}
        targetLabel={`of ${goals?.targetCalories || 2000}`}
        Icon={Flame}
        iconClassName="text-primary-600"
        barClassName="bg-primary-600"
        percentage={caloriePercentage}
      />
      <StatCard
        label="Protein"
        value={formatNutrient(todayStats?.totalProtein, 'g')}
        targetLabel={`of ${goals?.targetProtein || 150}g`}
        Icon={Drumstick}
        iconClassName="text-red-500"
        barClassName="bg-red-500"
        percentage={proteinPercentage}
        suggestDisabled={suggestingNutrient}
        onSuggest={() => onNutrientSuggestion('Protein', todayStats?.totalProtein || 0, goals?.targetProtein || 150)}
      />
      <StatCard
        label="Carbs"
        value={formatNutrient(todayStats?.totalCarbs, 'g')}
        targetLabel={`of ${goals?.targetCarbs || 250}g`}
        Icon={Wheat}
        iconClassName="text-blue-500"
        barClassName="bg-blue-500"
        percentage={carbsPercentage}
        suggestDisabled={suggestingNutrient}
        onSuggest={() => onNutrientSuggestion('Carbs', todayStats?.totalCarbs || 0, goals?.targetCarbs || 250)}
      />
      <StatCard
        label="Fats"
        value={formatNutrient(todayStats?.totalFats, 'g')}
        targetLabel={`of ${goals?.targetFats || 65}g`}
        Icon={Droplet}
        iconClassName="text-amber-500"
        barClassName="bg-amber-500"
        percentage={fatsPercentage}
        suggestDisabled={suggestingNutrient}
        onSuggest={() => onNutrientSuggestion('Fats', todayStats?.totalFats || 0, goals?.targetFats || 65)}
      />
    </motion.div>
  );
};
