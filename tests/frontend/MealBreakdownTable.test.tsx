import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealBreakdownTable } from '../../src/components/dashboard/MealBreakdownTable';
import { MealType, type UserGoals } from '../../src/types';
import type { MealTypeStats } from '../../src/components/dashboard/useDashboardData';

// Mock the AI client so the "Get insight" action is exercised without network.
vi.mock('../../src/services/openai', () => ({
  getMealInsight: vi.fn(async () => ({
    assessment: 'Light on protein.',
    shortfalls: [{ nutrient: 'protein', note: 'Add a protein source.' }],
    improveThisMeal: ['Add a katori of dal.'],
    makeUp: [{ mealType: 'dinner', suggestion: 'Include paneer or eggs.' }],
  })),
}));

const goals: UserGoals = {
  targetWeight: 75,
  targetCalories: 2650,
  targetProtein: 159,
  targetCarbs: 265,
  targetFats: 53,
  targetFiber: 30,
};

const loggedLunch: MealTypeStats = {
  mealType: MealType.Lunch,
  calories: 600,
  protein: 30,
  carbs: 70,
  fats: 15,
  fiber: 5,
  isLogged: true,
};

const unloggedDinner: MealTypeStats = {
  mealType: MealType.Dinner,
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  isLogged: false,
};

const renderTable = (stats: MealTypeStats[]) =>
  render(
    <MealBreakdownTable
      mealTypeStats={stats}
      goals={goals}
      isToday
      selectedDate={new Date()}
    />
  );

describe('MealBreakdownTable', () => {
  it('shows a logged meal with its macros visible without expanding', () => {
    renderTable([loggedLunch]);
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    // Macros are shown by default (A+D design), not hidden behind a toggle.
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('Fats')).toBeInTheDocument();
    expect(screen.getByText('Fiber')).toBeInTheDocument();
  });

  it('does not render the old "Low X" shortfall badges', () => {
    renderTable([loggedLunch]); // protein 30 of 750-weighted target is a shortfall
    expect(screen.queryByText(/^Low /)).not.toBeInTheDocument();
  });

  it('shows the Get insight action on a logged meal without expanding', () => {
    renderTable([loggedLunch]);
    expect(screen.getByRole('button', { name: /get insight/i })).toBeInTheDocument();
  });

  it('fetches and shows the insight inline when Get insight is clicked', async () => {
    renderTable([loggedLunch]);
    fireEvent.click(screen.getByRole('button', { name: /get insight/i }));
    expect(await screen.findByText('Light on protein.')).toBeInTheDocument();
    expect(screen.getByText('Improve this meal')).toBeInTheDocument();
    expect(screen.getByText('Make it up later')).toBeInTheDocument();
  });

  it('renders an unlogged meal as a slim target-only row', () => {
    renderTable([unloggedDinner]);
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText(/Target \d+ kcal/)).toBeInTheDocument();
    // No insight action on an unlogged meal.
    expect(screen.queryByRole('button', { name: /get insight/i })).not.toBeInTheDocument();
  });
});
