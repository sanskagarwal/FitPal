import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DaySummaryHero } from '../../src/components/dashboard/DaySummaryHero';
import { ThemeProvider } from '../../src/context/ThemeContext';
import type { DailyStats, UserGoals } from '../../src/types';

const goals: UserGoals = {
  targetWeight: 75,
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 250,
  targetFats: 65,
  targetFiber: 30,
};

const stats = (overrides: Partial<DailyStats> = {}): DailyStats => ({
  date: new Date(),
  totalCalories: 1200,
  totalProtein: 80,
  totalCarbs: 150,
  totalFats: 40,
  mealsLogged: 2,
  ...overrides,
});

const renderHero = (todayStats: DailyStats | null) =>
  render(
    <ThemeProvider>
      <DaySummaryHero todayStats={todayStats} goals={goals} />
    </ThemeProvider>
  );

describe('DaySummaryHero', () => {
  it('shows consumed and target calories', () => {
    renderHero(stats());
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('of 2000 kcal')).toBeInTheDocument();
  });

  it('shows remaining calories when under target', () => {
    renderHero(stats({ totalCalories: 1200 }));
    expect(screen.getByText('800 left')).toBeInTheDocument();
  });

  it('shows calories over the target when exceeded', () => {
    renderHero(stats({ totalCalories: 2300 }));
    expect(screen.getByText('300 over')).toBeInTheDocument();
  });

  it('renders protein, carbs and fats pills against their targets', () => {
    renderHero(stats({ totalProtein: 80, totalCarbs: 150, totalFats: 40 }));
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('Fats')).toBeInTheDocument();
    expect(screen.getByText('/ 150g')).toBeInTheDocument();
  });

  it('prompts to log when no meals are recorded', () => {
    renderHero(stats({ mealsLogged: 0 }));
    expect(screen.getByText('No meals logged yet')).toBeInTheDocument();
  });
});
