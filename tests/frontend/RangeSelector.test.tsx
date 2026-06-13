import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RangeSelector } from '../../src/components/dashboard/trends/RangeSelector';
import { ThemeProvider } from '../../src/context/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('RangeSelector', () => {
  it('renders the four range options', () => {
    renderWithTheme(<RangeSelector range={30} onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30D' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '90D' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
  });

  it('marks the active range as selected', () => {
    renderWithTheme(<RangeSelector range={90} onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: '90D' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '30D' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the selected range, including the "all" sentinel', () => {
    const onChange = vi.fn();
    renderWithTheme(<RangeSelector range={30} onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: '7D' }));
    expect(onChange).toHaveBeenCalledWith(7);

    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
