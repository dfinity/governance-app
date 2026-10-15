import '@/i18n/config';

import type { ProposalInfo } from '@icp-sdk/canisters/nns';
import { ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProposalListItem } from './ProposalListItem';

// ─── Module mocks ────────────────────────────────────────────────

vi.mock('../hooks/useVoting', () => ({
  useVoting: () => ({
    vote: vi.fn(),
    isVoting: false,
    hasVoted: false,
    isVoteMixed: false,
    voteValue: Vote.Unspecified,
    canVote: false,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const KNOWN_NEURON_NAMES = new Map([[27n, 'DFINITY Foundation']]);

const mockProposal = (proposer: bigint | undefined): ProposalInfo =>
  ({
    id: 140101n,
    proposer,
    status: ProposalStatus.Open,
    topic: Topic.Governance,
    deadlineTimestampSeconds: 0n,
    latestTally: undefined,
    proposal: { title: 'Test proposal' },
  }) as unknown as ProposalInfo;

const renderItem = (proposer: bigint | undefined) =>
  render(
    <ProposalListItem proposal={mockProposal(proposer)} knownNeuronNames={KNOWN_NEURON_NAMES} />,
  );

describe('ProposalListItem', () => {
  it('shows the proposer badge with the known neuron name', () => {
    renderItem(27n);

    expect(screen.getByTestId('proposal-proposer-badge').textContent).toContain(
      'DFINITY Foundation',
    );
  });

  it('shows no proposer badge without a proposer', () => {
    renderItem(undefined);

    expect(screen.queryByTestId('proposal-proposer-badge')).toBeNull();
  });
});
