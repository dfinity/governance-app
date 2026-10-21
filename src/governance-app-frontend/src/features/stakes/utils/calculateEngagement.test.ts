import type { Ballot, ProposalInfo } from '@icp-sdk/canisters/nns';
import { ProposalRewardStatus, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { mockNeuron as baseMockNeuron } from '@fixtures/neuron';

import { calculateEngagement } from './calculateEngagement';

const mockNeuron = (neuronId: bigint) => baseMockNeuron({ neuronId, fullNeuron: undefined });

const mockBallot = (neuronId: bigint, vote: Vote): Ballot => ({
  neuronId,
  vote,
  votingPower: 100_000_000n,
});

const mockProposal = (id: bigint, ballots: Ballot[]): ProposalInfo => ({
  id,
  ballots,
  rejectCost: 0n,
  proposalTimestampSeconds: 0n,
  rewardEventRound: 0n,
  failedTimestampSeconds: 0n,
  decidedTimestampSeconds: 0n,
  deadlineTimestampSeconds: undefined,
  latestTally: undefined,
  proposal: undefined,
  proposer: undefined,
  executedTimestampSeconds: 0n,
  topic: Topic.Governance,
  status: ProposalStatus.Executed,
  rewardStatus: ProposalRewardStatus.AcceptVotes,
  totalPotentialVotingPower: undefined,
});

describe('calculateEngagement', () => {
  it('returns null when neurons is undefined', () => {
    const proposals = [mockProposal(1n, [])];
    expect(calculateEngagement(undefined, proposals)).toBeNull();
  });

  it('returns null when neurons is empty', () => {
    const proposals = [mockProposal(1n, [])];
    expect(calculateEngagement([], proposals)).toBeNull();
  });

  it('returns null when proposals is undefined', () => {
    const neurons = [mockNeuron(1n)];
    expect(calculateEngagement(neurons, undefined)).toBeNull();
  });

  it('returns null when proposals is empty', () => {
    const neurons = [mockNeuron(1n)];
    expect(calculateEngagement(neurons, [])).toBeNull();
  });

  it('returns null when neuron has no ballots in any proposal', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [mockProposal(1n, [mockBallot(99n, Vote.Yes)])];
    expect(calculateEngagement(neurons, proposals)).toBeNull();
  });

  it('returns 100% when neuron voted on all eligible proposals', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(1n, [mockBallot(1n, Vote.Yes)]),
      mockProposal(2n, [mockBallot(1n, Vote.No)]),
      mockProposal(3n, [mockBallot(1n, Vote.Yes)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({
      rate: 1,
      proposals: [
        { proposalId: 1n, voted: true },
        { proposalId: 2n, voted: true },
        { proposalId: 3n, voted: true },
      ],
    });
  });

  it('returns 0% when neuron is eligible but never voted', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(1n, [mockBallot(1n, Vote.Unspecified)]),
      mockProposal(2n, [mockBallot(1n, Vote.Unspecified)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({
      rate: 0,
      proposals: [
        { proposalId: 1n, voted: false },
        { proposalId: 2n, voted: false },
      ],
    });
  });

  it('calculates partial engagement correctly', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(1n, [mockBallot(1n, Vote.Yes)]),
      mockProposal(2n, [mockBallot(1n, Vote.Unspecified)]),
      mockProposal(3n, [mockBallot(1n, Vote.No)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({
      rate: 2 / 3,
      proposals: [
        { proposalId: 1n, voted: true },
        { proposalId: 2n, voted: false },
        { proposalId: 3n, voted: true },
      ],
    });
  });

  it('excludes proposals the neuron is not eligible for', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(1n, [mockBallot(1n, Vote.Yes)]),
      mockProposal(2n, [mockBallot(99n, Vote.Yes)]),
      mockProposal(3n, [mockBallot(1n, Vote.Unspecified)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({
      rate: 0.5,
      proposals: [
        { proposalId: 1n, voted: true },
        { proposalId: 3n, voted: false },
      ],
    });
  });

  it('counts ballots across multiple neurons', () => {
    const neurons = [mockNeuron(1n), mockNeuron(2n)];
    const proposals = [
      mockProposal(1n, [mockBallot(1n, Vote.Yes), mockBallot(2n, Vote.Yes)]),
      mockProposal(2n, [mockBallot(1n, Vote.Unspecified), mockBallot(2n, Vote.Yes)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({
      rate: 3 / 4,
      proposals: [
        { proposalId: 1n, voted: true },
        { proposalId: 2n, voted: false },
      ],
    });
  });

  it('ignores ballots from neurons the user does not own', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(1n, [
        mockBallot(1n, Vote.Yes),
        mockBallot(99n, Vote.Yes),
        mockBallot(100n, Vote.No),
      ]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result).toEqual({ rate: 1, proposals: [{ proposalId: 1n, voted: true }] });
  });

  it('lists the proposals from the oldest to the newest', () => {
    const neurons = [mockNeuron(1n)];
    const proposals = [
      mockProposal(3n, [mockBallot(1n, Vote.Yes)]),
      mockProposal(1n, [mockBallot(1n, Vote.Unspecified)]),
      mockProposal(2n, [mockBallot(1n, Vote.Yes)]),
    ];

    const result = calculateEngagement(neurons, proposals);
    expect(result?.proposals.map(({ proposalId }) => proposalId)).toEqual([1n, 2n, 3n]);
  });
});
