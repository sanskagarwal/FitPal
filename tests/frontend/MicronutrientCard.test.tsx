import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MicronutrientCard } from '../../src/components/dashboard/MicronutrientCard';

describe('MicronutrientCard', () => {
  it('renders the label and value over target', () => {
    render(
      <MicronutrientCard
        label="Fiber"
        value={12}
        unit="g"
        target={30}
        barClassName="bg-purple-500"
        valueClassName="text-purple-600"
        onSuggest={() => {}}
      />
    );
    expect(screen.getByText('Fiber')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('/ 30g')).toBeInTheDocument();
  });

  it('exposes an accessible icon-only "Suggest foods" action', () => {
    const onSuggest = vi.fn();
    render(
      <MicronutrientCard
        label="Iron"
        value={5}
        unit="mg"
        target={18}
        barClassName="bg-red-500"
        valueClassName="text-red-600"
        onSuggest={onSuggest}
      />
    );
    const button = screen.getByRole('button', { name: 'Suggest foods rich in Iron' });
    fireEvent.click(button);
    expect(onSuggest).toHaveBeenCalledOnce();
  });

  it('disables the suggest action when requested', () => {
    render(
      <MicronutrientCard
        label="Calcium"
        value={400}
        unit="mg"
        target={1000}
        barClassName="bg-blue-500"
        valueClassName="text-blue-600"
        onSuggest={() => {}}
        suggestDisabled
      />
    );
    expect(screen.getByRole('button', { name: 'Suggest foods rich in Calcium' })).toBeDisabled();
  });
});
