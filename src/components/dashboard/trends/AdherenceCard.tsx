import { CalendarCheck, Flame, Target } from 'lucide-react';

interface AdherenceCardProps {
  daysLogged: number;
  totalDays: number;
  adherence: number;
  currentStreak: number;
}

// Logging adherence summary for the selected range: days logged out of the
// window, the adherence percentage (with a progress bar), and the current streak.
export const AdherenceCard = ({ daysLogged, totalDays, adherence, currentStreak }: AdherenceCardProps) => (
  <div className="card">
    <h2 className="mb-4 text-xl font-semibold">Logging adherence</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Days logged</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {daysLogged}
            <span className="text-base font-medium text-gray-500 dark:text-gray-400"> / {totalDays}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-amber-500" />
        <div className="w-full">
          <p className="text-sm text-gray-600 dark:text-gray-300">Adherence</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{adherence}%</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${adherence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Flame className="h-8 w-8 text-orange-500" />
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Current streak</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentStreak} <span className="text-base font-medium text-gray-500 dark:text-gray-400">days</span>
          </p>
        </div>
      </div>
    </div>
  </div>
);
