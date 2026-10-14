import '@/i18n/config';

import type { KnownNeuron, ProposalInfo } from '@icp-sdk/canisters/nns';
import { ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProposalListItem } from './ProposalListItem';

// ─── Module mocks ────────────────────────────────────────────────

const knownNeuronsState = vi.hoisted(() => ({
  response: undefined as KnownNeuron[] | undefined,
}));

vi.mock('@hooks/governance/useGovernanceKnownNeurons', () => ({
  useGovernanceKnownNeurons: () => ({
    data: knownNeuronsState.response && { certified: true, response: knownNeuronsState.response },
    isLoading: false,
  }),
}));

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

const KNOWN_NEURON: KnownNeuron = {
  id: 27n,
  name: 'DFINITY Foundation',
  description: '',
  links: [],
  committed_topics: [],
};

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

const getProposerBadge = () => screen.getByTestId('proposal-proposer-badge');

describe('ProposalListItem', () => {
  beforeEach(() => {
    knownNeuronsState.response = [KNOWN_NEURON];
  });

  it('shows the name of a known proposer', () => {
    render(<ProposalListItem proposal={mockProposal(27n)} />);

    expect(getProposerBadge().textContent).toBe('DFINITY Foundation');
  });

  it('shows the truncated neuron ID of an unknown proposer', () => {
    render(<ProposalListItem proposal={mockProposal(6914974521667616512n)} />);

    expect(getProposerBadge().textContent).toBe('69149...16512');
  });

  it('shows the neuron ID of a known proposer until the known neurons load', () => {
    knownNeuronsState.response = undefined;
    render(<ProposalListItem proposal={mockProposal(27n)} />);

    expect(getProposerBadge().textContent).toBe('27');
  });

  it('shows no proposer badge without a proposer', () => {
    render(<ProposalListItem proposal={mockProposal(undefined)} />);

    expect(screen.queryByTestId('proposal-proposer-badge')).toBeNull();
  });
});
