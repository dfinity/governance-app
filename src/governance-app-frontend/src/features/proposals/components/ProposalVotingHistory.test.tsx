import '@/i18n/config';

import { ProposalInfo, Topic } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
