import { formatDayLabel } from '../../utils/helpers';
import { MealTypeStats } from './useDashboardData';

interface MealBreakdownTableProps {
  mealTypeStats: MealTypeStats[];
  isToday: boolean;
  selectedDate: Date;
}

export const MealBreakdownTable = ({ mealTypeStats, isToday, selectedDate }: MealBreakdownTableProps) => {
  if (mealTypeStats.length === 0) return null;

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">{isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`} Meal Breakdown</h2>
      <div className="space-y-3">
        {mealTypeStats.map((stat) => (
          <div key={stat.mealType} className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 capitalize mb-2">{stat.mealType}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Calories:</span>
                <span className="ml-1 font-semibold">{Math.round(stat.calories)}</span>
              </div>
              <div>
                <span className="text-gray-600">Protein:</span>
                <span className="ml-1 font-semibold">{Math.round(stat.protein)}g</span>
              </div>
              <div>
                <span className="text-gray-600">Carbs:</span>
                <span className="ml-1 font-semibold">{Math.round(stat.carbs)}g</span>
              </div>
              <div>
                <span className="text-gray-600">Fats:</span>
                <span className="ml-1 font-semibold">{Math.round(stat.fats)}g</span>
              </div>
              <div>
                <span className="text-gray-600">Fiber:</span>
                <span className="ml-1 font-semibold">{Math.round(stat.fiber)}g</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
