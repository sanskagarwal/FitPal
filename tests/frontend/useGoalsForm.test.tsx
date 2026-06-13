import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '../../src/types';

vi.mock('../../src/utils/db', () => ({
  getWeightsByUser: vi.fn(async () => []),
}));

vi.mock('../../src/services/openai', () => ({
  suggestGoals: vi.fn(async () => ({
    calories: 1800,
    protein: 140,
    carbs: 180,
    fats: 55,
    fiber: 30,
    explanation: 'Suggested.',
  })),
}));

import { useGoalsForm } from '../../src/components/goals/useGoalsForm';

const user = {
  id: 'u1',
  profile: {
    dateOfBirth: '1996-06-05',
    gender: 'male',
    height: 180,
    activityLevel: 'moderate',
    goals: { targetWeight: 75, targetCalories: 2000, targetProtein: 150, targetCarbs: 250, targetFats: 65, targetFiber: 30 },
  },
} as unknown as User;

describe('useGoalsForm dirty tracking', () => {
  it('starts clean, flags edits, and clears after save', async () => {
    const updateGoals = vi.fn(async () => {});
    const { result } = renderHook(() => useGoalsForm({ user, updateGoals }));

    expect(result.current.isDirty).toBe(false);

    act(() => result.current.updateField('targetCalories', 2500));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveGoals();
    });

    expect(updateGoals).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isDirty).toBe(false));
  });

  it('reverts edits back to the last saved values on reset', () => {
    const updateGoals = vi.fn(async () => {});
    const { result } = renderHook(() => useGoalsForm({ user, updateGoals }));

    act(() => result.current.updateField('targetCalories', 3000));
    expect(result.current.formData.targetCalories).toBe(3000);
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.resetForm());
    expect(result.current.formData.targetCalories).toBe(2000);
    expect(result.current.isDirty).toBe(false);
  });
});
