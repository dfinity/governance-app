import '@/i18n/config';

import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VOTING_HISTORY_CARD_ID } from '../tallyHistory';
import { ProposalResultSummary } from './ProposalResultSummary';

const mocks = vi.hoisted(() => ({ chart: null as unknown }));

vi.mock('../hooks/useVotingHistoryChart', () => ({
  useVotingHistoryChart: () => mocks.chart,
}));

const proposal = (tally?: { yes: bigint; no: bigint; total: bigint }) =>
  ({
    id: 144925n,
    latestTally: tally && { ...tally, timestampSeconds: 0n },
  }) as ProposalInfo;

const TALLY = { yes: 2_650n, no: 90n, total: 100_000n };

describe('ProposalResultSummary', () => {
  beforeEach(() => {
    mocks.chart = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('shows the Yes and No shares of the total voting power', () => {
    render(<ProposalResultSummary proposal={proposal(TALLY)} />);

    expect(screen.getByText('Yes 2.65%')).toBeTruthy();
    expect(screen.getByText('No 0.09%')).toBeTruthy();
  });

  it('shows zero shares when the total voting power is zero', () => {
    render(<ProposalResultSummary proposal={proposal({ yes: 0n, no: 0n, total: 0n })} />);

    expect(screen.getByText('Yes 0.00%')).toBeTruthy();
    expect(screen.getByText('No 0.00%')).toBeTruthy();
  });

  it('shows nothing without a tally', () => {
    render(<ProposalResultSummary proposal={proposal()} />);

    expect(screen.queryByTestId('proposal-result-summary')).toBeNull();
  });

  it('is not a button when the Voting history card does not show', () => {
    render(<ProposalResultSummary proposal={proposal(TALLY)} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Voting history')).toBeNull();
  });

  it('is a button while the Voting history card loads', () => {
    mocks.chart = undefined;
    render(<ProposalResultSummary proposal={proposal(TALLY)} />);

    expect(screen.getByRole('button', { name: /Voting history/ })).toBeTruthy();
  });

  it('moves the focus to the Voting history card and scrolls to it on a click', async () => {
    mocks.chart = { points: [] };
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const card = document.createElement('div');
    card.id = VOTING_HISTORY_CARD_ID;
    card.tabIndex = -1;
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);
    const focus = vi.spyOn(card, 'focus');
    render(<ProposalResultSummary proposal={proposal(TALLY)} />);

    await userEvent.click(screen.getByRole('button', { name: /Voting history/ }));

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(card);
    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('scrolls with no animation when the user prefers reduced motion', async () => {
    mocks.chart = { points: [] };
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const card = document.createElement('div');
    card.id = VOTING_HISTORY_CARD_ID;
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);
    render(<ProposalResultSummary proposal={proposal(TALLY)} />);

    await userEvent.click(screen.getByRole('button', { name: /Voting history/ }));

    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
