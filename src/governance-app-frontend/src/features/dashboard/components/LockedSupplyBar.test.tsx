import '@/i18n/config';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LockedSupplyBar } from './LockedSupplyBar';

// The real Radix tooltip, so the tests cover when the legend shows.
vi.unmock('@components/Tooltip');

// Radix positions the tooltip with ResizeObserver, which jsdom does not have.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const BREAKDOWN = {
  totalSupply: 1_000,
  maxLock: 300,
  shorterLock: 56,
  dissolving: 80,
  notLocked: 564,
};

const renderBar = () => {
  render(<LockedSupplyBar breakdown={BREAKDOWN} />);
  return screen.getByTestId('locked-supply-bar');
};

const tap = (user: ReturnType<typeof userEvent.setup>, target: Element) =>
  user.pointer({ keys: '[TouchA]', target });

describe('LockedSupplyBar', () => {
  it('sizes the locked parts by their share of the supply', () => {
    const bar = renderBar();

    const widths = [...bar.querySelectorAll<HTMLElement>('[aria-hidden] > span')].map((part) =>
      parseFloat(part.style.width),
    );
    expect(widths).toHaveLength(3);
    [30, 5.6, 8].forEach((width, index) => expect(widths[index]).toBeCloseTo(width));
  });

  it('shows the legend on hover', async () => {
    const user = userEvent.setup();
    const bar = renderBar();

    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.hover(bar);

    expect((await screen.findByRole('tooltip')).textContent).toContain('Max 2-year lock30030.0%');
  });

  it('shows the legend on tap and closes it on dismissal', async () => {
    const user = userEvent.setup();
    const bar = renderBar();

    await tap(user, bar);

    expect((await screen.findByRole('tooltip')).textContent).toContain('Not locked56456.4%');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('shows the legend on keyboard focus', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.tab();

    expect((await screen.findByRole('tooltip')).textContent).toContain('Total supply1K ICP');
  });
});
