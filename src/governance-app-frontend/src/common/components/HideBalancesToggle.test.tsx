import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HideBalancesToggle } from '@components/HideBalancesToggle';

const state = vi.hoisted(() => ({ hidden: false, setHidden: vi.fn() }));
vi.mock('@hooks/useHideBalances', () => ({
  useHideBalances: () => ({ hidden: state.hidden, setHidden: state.setHidden }),
}));

describe('HideBalancesToggle', () => {
  beforeEach(() => {
    state.setHidden.mockReset();
  });

  it('hides the balances when they are visible', () => {
    state.hidden = false;
    render(<HideBalancesToggle />);

    const button = screen.getByRole('button', { name: 'Hide balances' });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);
    expect(state.setHidden).toHaveBeenCalledWith(true);
  });

  it('shows the balances when they are hidden', () => {
    state.hidden = true;
    render(<HideBalancesToggle />);

    const button = screen.getByRole('button', { name: 'Show balances' });
    expect(button.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(button);
    expect(state.setHidden).toHaveBeenCalledWith(false);
  });
});
