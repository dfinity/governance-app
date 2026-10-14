import '@/i18n/config';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProposerBadge } from './ProposerBadge';

// ─── Helpers ─────────────────────────────────────────────────────

const KNOWN_NEURON_NAMES = new Map([[27n, 'DFINITY Foundation']]);

const renderBadge = (proposer: bigint) => {
  render(<ProposerBadge proposer={proposer} knownNeuronNames={KNOWN_NEURON_NAMES} />);
  return screen.getByTestId('proposal-proposer-badge');
};

describe('ProposerBadge', () => {
  it('shows the name of a known proposer with an accessible label', () => {
    const badge = renderBadge(27n);

    expect(within(badge).getByText('DFINITY Foundation').getAttribute('aria-hidden')).toBe('true');
    expect(within(badge).getByText('Proposer: DFINITY Foundation').className).toContain('sr-only');
    expect(badge.getAttribute('title')).toBe('27');
  });

  it('shows the truncated ID of an unknown proposer and keeps the full ID', () => {
    const badge = renderBadge(6914974521667616512n);

    expect(within(badge).getByText('69149...16512').getAttribute('aria-hidden')).toBe('true');
    expect(within(badge).getByText('Proposer: 6914974521667616512').className).toContain('sr-only');
    expect(badge.getAttribute('title')).toBe('6914974521667616512');
  });
});
