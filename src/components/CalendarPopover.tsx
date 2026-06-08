import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMealsByUser } from '../utils/db';
import { getStartOfDay, isSameDay, toDateInputValue } from '../utils/helpers';

interface CalendarPopoverProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// A month-grid date picker. Each day is tinted green when calories were logged
// that day and gray when nothing was logged, so progress is visible at a glance.
export const CalendarPopover = ({ selectedDate, onSelect, onClose }: CalendarPopoverProps) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  // Map of YYYY-MM-DD -> total calories logged that day.
  const [caloriesByDay, setCaloriesByDay] = useState<Record<string, number>>({});

  const today = getStartOfDay(new Date());

  // Load meals once and aggregate calories per day.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      const meals = await getMealsByUser(user.id);
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const meal of meals) {
        const key = toDateInputValue(new Date(meal.date));
        map[key] = (map[key] || 0) + (meal.totalNutrients?.calories || 0);
      }
      setCaloriesByDay(map);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Close on outside click or Escape.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);

  const goToPrevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goToNextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // Disable navigating to months entirely in the future.
  const nextMonthDisabled =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() >= today.getMonth());

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
      role="dialog"
      aria-label="Choose a date"
    >
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          disabled={nextMonthDisabled}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isFuture = getStartOfDay(day).getTime() > today.getTime();
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const hasCalories = (caloriesByDay[toDateInputValue(day)] || 0) > 0;

          let tone = 'bg-gray-100 text-gray-400';
          if (hasCalories) tone = 'bg-primary-500 text-white hover:bg-primary-600';
          else if (!isFuture) tone = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

          return (
            <button
              key={toDateInputValue(day)}
              onClick={() => {
                if (!isFuture) {
                  onSelect(day);
                  onClose();
                }
              }}
              disabled={isFuture}
              aria-label={day.toDateString()}
              aria-current={isToday ? 'date' : undefined}
              title={hasCalories ? `${Math.round(caloriesByDay[toDateInputValue(day)])} kcal logged` : 'No meals logged'}
              className={`relative flex h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${
                isSelected ? 'ring-2 ring-primary-600 ring-offset-1' : ''
              }`}
            >
              {day.getDate()}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary-500" /> Logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gray-100" /> No meals
        </span>
      </div>
    </div>
  );
};
