import { useState } from 'react';
import { User, UserGoals } from '../../../types';
import { useTrendsData, TrendRange } from './useTrendsData';
import { RangeSelector } from './RangeSelector';
import { WeightKpiGrid } from '../../weight/WeightKpiGrid';
import { WeightTrendChart } from './WeightTrendChart';
import { CalorieTrendChart } from './CalorieTrendChart';
import { MacroTrendChart } from './MacroTrendChart';
import { AdherenceCard } from './AdherenceCard';

interface TrendsSectionProps {
  user: User | null;
  goals?: UserGoals;
}

// Dashboard "Trends & progress" body: a range selector that drives the weight,
// calorie, macro, and adherence views over the most recent 7/30/90 days or all.
export const TrendsSection = ({ user, goals }: TrendsSectionProps) => {
  const [range, setRange] = useState<TrendRange>(30);
  const trends = useTrendsData(user, range);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <RangeSelector range={range} onChange={setRange} />
      </div>

      <WeightKpiGrid
        variant="compact"
        latestWeight={trends.latestWeight}
        targetWeight={goals?.targetWeight ?? 0}
      />

      <WeightTrendChart chartData={trends.weightSeries} targetWeight={goals?.targetWeight ?? 0} />
      <CalorieTrendChart days={trends.days} targetCalories={goals?.targetCalories} />
      <MacroTrendChart days={trends.days} goals={goals} />
      <AdherenceCard
        daysLogged={trends.daysLogged}
        totalDays={trends.totalDays}
        adherence={trends.adherence}
        currentStreak={trends.currentStreak}
      />
    </div>
  );
};
