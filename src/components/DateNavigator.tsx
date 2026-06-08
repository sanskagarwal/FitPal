import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { useSelectedDate } from '../context/DateContext';
import { formatDayLabel } from '../utils/helpers';
import { CalendarPopover } from './CalendarPopover';

// A compact day navigator: previous / next arrows, a tappable date label that
// opens a month-grid picker (with logged days highlighted), and a "Today"
// shortcut when viewing a past day.
export const DateNavigator = () => {
  const { selectedDate, setSelectedDate, goToPreviousDay, goToNextDay, goToToday, isToday } =
    useSelectedDate();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={goToPreviousDay}
        className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="Previous day"
        title="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-sm hover:border-primary-300 dark:hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          title="Pick a date"
        >
          <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-[5.5rem] text-center">
            {formatDayLabel(selectedDate)}
          </span>
        </button>

        {pickerOpen && (
          <CalendarPopover
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      <button
        onClick={goToNextDay}
        disabled={isToday}
        className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="Next day"
        title="Next day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {!isToday && (
        <button
          onClick={goToToday}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-primary-300 dark:bg-primary-900/40 dark:hover:bg-primary-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          title="Jump to today"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Today
        </button>
      )}
    </div>
  );
};
