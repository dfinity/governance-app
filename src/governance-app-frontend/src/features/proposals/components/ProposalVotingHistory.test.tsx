import '@/i18n/config';

import { ProposalInfo, Topic } from '@icp-sdk/canisters/nns';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TALLY_RECORDING_SINCE_SECONDS, TallyHistory } from '../tallyHistory';
import { ProposalVotingHistory } from './ProposalVotingHistory';

const mocks = vi.hoisted(() => ({
  query: {} as { data?: unknown; isPending: boolean; isError: boolean },
}));

vi.mock('../hooks/useProposalTallyHistory', () => ({
  useProposalTallyHistory: () => mocks.query,
}));

const CREATED = TALLY_RECORDING_SINCE_SECONDS;
const DEADLINE = CREATED + 4 * 86_400;

const proposal = (overrides: Partial<ProposalInfo> = {}) =>
  ({
    id: 144719n,
    topic: Topic.IcOsVersionDeployment,
    proposalTimestampSeconds: BigInt(CREATED),
    deadlineTimestampSeconds: BigInt(DEADLINE),
    latestTally: undefined,
    ...overrides,
  }) as ProposalInfo;

const history = (readings: TallyHistory['track'][number]['readings']): TallyHistory => ({
  recordingSince: BigInt(CREATED),
  outages: [],
  track: [
    {
      total: 1_000n,
      firstReadAt: BigInt(CREATED),
      closedAt: 0n,
      finalRead: false,
      refused: 0n,
      deadlines: [],
      readings,
      next: [],
    },
  ],
});

describe('ProposalVotingHistory', () => {
  beforeEach(() => {
    mocks.query = { data: undefined, isPending: true, isError: false };
  });

  it('shows the chart with a Yes and No legend', () => {
    mocks.query = {
      data: history([{ t: BigInt(CREATED + 60), yes: 937n, no: 0n }]),
      isPending: false,
      isError: false,
    };
    render(<ProposalVotingHistory proposal={proposal()} />);

    expect(screen.getByText('Voting history')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
    expect(screen.getByTestId('proposal-voting-history-chart')).toBeTruthy();
  });

  it('keeps the card box while the history loads', () => {
    render(<ProposalVotingHistory proposal={proposal()} />);

    expect(screen.getByText('Voting history')).toBeTruthy();
    expect(screen.queryByTestId('proposal-voting-history-chart')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows nothing when the collector has no track for the proposal', () => {
    mocks.query = { data: { ...history([]), track: [] }, isPending: false, isError: false };
    render(<ProposalVotingHistory proposal={proposal()} />);

    expect(screen.queryByTestId('proposal-voting-history')).toBeNull();
  });

  it('shows nothing when the read fails', () => {
    mocks.query = { data: undefined, isPending: false, isError: true };
    render(<ProposalVotingHistory proposal={proposal()} />);

    expect(screen.queryByTestId('proposal-voting-history')).toBeNull();
  });

  it('shows nothing for a proposal that closed before the recording began', () => {
    render(
      <ProposalVotingHistory
        proposal={proposal({ deadlineTimestampSeconds: BigInt(CREATED - 1) })}
      />,
    );

    expect(screen.queryByTestId('proposal-voting-history')).toBeNull();
  });

  describe('sized chart', () => {
    // Recharts draws nothing at a size of 0, so the container reports a fixed size.
    beforeEach(() => {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(private callback: ResizeObserverCallback) {}
          observe(target: Element) {
            this.callback(
              [{ target, contentRect: { width: 600, height: 180 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
          }
          unobserve() {}
          disconnect() {}
        },
      );
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(180);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    const renderWithYes = (yes: bigint) => {
      mocks.query = {
        data: history([{ t: BigInt(CREATED + 60), yes, no: 0n }]),
        isPending: false,
        isError: false,
      };
      render(<ProposalVotingHistory proposal={proposal()} />);
    };

    it('shows the 3% line and hides the 50% line below a 50% axis', async () => {
      renderWithYes(1n);

      expect(await screen.findByText('Yes minimum 3%')).toBeTruthy();
      expect(screen.queryByText('Absolute majority 50%')).toBeNull();
    });

    it('shows the 50% line on a 50% axis', async () => {
      renderWithYes(400n);

      expect(await screen.findByText('Absolute majority 50%')).toBeTruthy();
      expect(screen.getByText('Yes minimum 3%')).toBeTruthy();
    });

    it('shows the 50% line on the full axis', async () => {
      renderWithYes(600n);

      expect(await screen.findByText('Absolute majority 50%')).toBeTruthy();
    });

    const tally = (yes: bigint, no: bigint) => ({
      data: history([{ t: BigInt(CREATED + 60), yes, no }]),
      isPending: false,
      isError: false,
    });

    // The marker that comes last in the document paints on top.
    const latestDotFills = () =>
      screen.queryAllByTestId('voting-history-latest').map((dot) => dot.getAttribute('fill'));

    it('marks the latest Yes value with a circle and the latest No value with a square', async () => {
      mocks.query = tally(30n, 10n);
      render(<ProposalVotingHistory proposal={proposal()} />);

      await waitFor(() =>
        expect(
          screen
            .queryAllByTestId('voting-history-latest')
            .map((dot) => [dot.tagName, dot.getAttribute('fill')]),
        ).toEqual([
          ['rect', 'var(--color-no)'],
          ['circle', 'var(--color-yes)'],
        ]),
      );
    });

    it('paints the Yes dot on top when Yes leads', async () => {
      mocks.query = tally(30n, 10n);
      render(<ProposalVotingHistory proposal={proposal()} />);

      await waitFor(() =>
        expect(latestDotFills()).toEqual(['var(--color-no)', 'var(--color-yes)']),
      );
    });

    it('paints the No dot on top when No leads', async () => {
      mocks.query = tally(10n, 30n);
      render(<ProposalVotingHistory proposal={proposal()} />);

      await waitFor(() =>
        expect(latestDotFills()).toEqual(['var(--color-yes)', 'var(--color-no)']),
      );
    });

    it('moves the dot of the new leader on top', async () => {
      mocks.query = tally(30n, 10n);
      const { rerender } = render(<ProposalVotingHistory proposal={proposal()} />);
      await waitFor(() =>
        expect(latestDotFills()).toEqual(['var(--color-no)', 'var(--color-yes)']),
      );

      mocks.query = tally(30n, 40n);
      rerender(<ProposalVotingHistory proposal={proposal()} />);

      await waitFor(() =>
        expect(latestDotFills()).toEqual(['var(--color-yes)', 'var(--color-no)']),
      );
    });
  });
});
