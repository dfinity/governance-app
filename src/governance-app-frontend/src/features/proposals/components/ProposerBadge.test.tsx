import '@/i18n/config';

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProposerBadge } from './ProposerBadge';

// ─── Module mocks ────────────────────────────────────────────────

// The real Radix tooltip, so the tests cover when the full ID shows.
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

// ─── Helpers ─────────────────────────────────────────────────────

const KNOWN_NEURON_NAMES = new Map([[27n, 'DFINITY Foundation']]);
const UNKNOWN_ID = 6914974521667616512n;
const TOOLTIP_TEXT = `Neuron #${UNKNOWN_ID}`;

const renderBadge = (proposer: bigint, interactive?: boolean) => {
  render(
    <ProposerBadge
      proposer={proposer}
      knownNeuronNames={KNOWN_NEURON_NAMES}
      interactive={interactive}
    />,
  );
  return screen.getByTestId('proposal-proposer-badge');
};

const tap = (user: ReturnType<typeof userEvent.setup>, target: Element) =>
  user.pointer({ keys: '[TouchA]', target });

describe('ProposerBadge', () => {
  it('shows the name of a known proposer with an accessible label', () => {
    const badge = renderBadge(27n);

    expect(within(badge).getByText('DFINITY Foundation').getAttribute('aria-hidden')).toBe('true');
    expect(within(badge).getByText('Proposer: DFINITY Foundation').className).toContain('sr-only');
  });

  it('shows the truncated ID of an unknown proposer and keeps the full ID in the label', () => {
    const badge = renderBadge(UNKNOWN_ID);

    expect(within(badge).getByText('69149...16512').getAttribute('aria-hidden')).toBe('true');
    expect(within(badge).getByText(`Proposer: ${UNKNOWN_ID}`).className).toContain('sr-only');
  });

  it('renders a span by default and a button when interactive', () => {
    expect(renderBadge(27n).tagName).toBe('SPAN');
    cleanup();
    expect(renderBadge(27n, true).tagName).toBe('BUTTON');
  });

  it('shows the full neuron ID on hover', async () => {
    const user = userEvent.setup();
    const badge = renderBadge(UNKNOWN_ID);

    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.hover(badge);

    expect((await screen.findByRole('tooltip')).textContent).toBe(TOOLTIP_TEXT);
  });

  it('does not open the tooltip on tap by default', async () => {
    const user = userEvent.setup();
    const badge = renderBadge(UNKNOWN_ID);

    await tap(user, badge);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens the tooltip on tap when interactive and closes it on dismissal', async () => {
    const user = userEvent.setup();
    const badge = renderBadge(UNKNOWN_ID, true);

    expect(screen.queryByRole('tooltip')).toBeNull();

    await tap(user, badge);

    expect((await screen.findByRole('tooltip')).textContent).toBe(TOOLTIP_TEXT);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('opens the tooltip on keyboard focus when interactive', async () => {
    const user = userEvent.setup();
    renderBadge(UNKNOWN_ID, true);

    await user.tab();

    expect((await screen.findByRole('tooltip')).textContent).toBe(TOOLTIP_TEXT);
  });
});
