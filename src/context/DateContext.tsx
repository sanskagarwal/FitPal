import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getStartOfDay, isSameDay } from '../utils/helpers';

interface DateContextType {
  /** The currently selected day (normalized to start of day, local time). */
  selectedDate: Date;
  /** Set the selected day. The value is normalized to the start of that day. */
  setSelectedDate: (date: Date) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  /** True when the selected day is today. */
  isToday: boolean;
  /** True when the selected day is in the future (next day is disabled past today). */
  isFuture: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSelectedDate = () => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useSelectedDate must be used within a DateProvider');
  }
  return context;
};

interface DateProviderProps {
  children: ReactNode;
}

export const DateProvider = ({ children }: DateProviderProps) => {
  const [selectedDate, setSelectedDateState] = useState<Date>(() => getStartOfDay(new Date()));

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(getStartOfDay(date));
  }, []);

  const goToPreviousDay = useCallback(() => {
    setSelectedDateState((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return getStartOfDay(next);
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDateState((prev) => {
      const today = getStartOfDay(new Date());
      // Never allow navigating past today.
      if (isSameDay(prev, today)) return prev;
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return getStartOfDay(next);
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDateState(getStartOfDay(new Date()));
  }, []);

  const today = getStartOfDay(new Date());
  const isToday = isSameDay(selectedDate, today);
  const isFuture = selectedDate.getTime() > today.getTime();

  return (
    <DateContext.Provider
      value={{ selectedDate, setSelectedDate, goToPreviousDay, goToNextDay, goToToday, isToday, isFuture }}
    >
      {children}
    </DateContext.Provider>
  );
};
