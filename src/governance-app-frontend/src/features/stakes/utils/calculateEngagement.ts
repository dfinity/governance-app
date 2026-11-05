import type { NeuronInfo, ProposalInfo } from '@icp-sdk/canisters/nns';
import { Vote } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';

export type ProposalParticipation = {
  proposalId: bigint;
  /** True when each eligible neuron of the user has voted. */
  voted: boolean;
};

export type EngagementResult = {
  /** Share of the eligible ballots with a vote. */
  rate: number;
  /** One entry per proposal with an eligible ballot, oldest first. */
  proposals: ProposalParticipation[];
} | null;

export const calculateEngagement = (
  neurons: NeuronInfo[] | undefined,
  proposals: ProposalInfo[] | undefined,
): EngagementResult => {
  if (!neurons?.length || !proposals?.length) return null;

  const neuronIds = new Set(neurons.map((n) => n.neuronId));

  let eligible = 0;
  let voted = 0;
  const participation: ProposalParticipation[] = [];

  for (const proposal of proposals) {
    if (isNullish(proposal.id)) continue;

    let proposalEligible = 0;
    let proposalVoted = 0;

    for (const ballot of proposal.ballots) {
      if (!neuronIds.has(ballot.neuronId)) continue;
      proposalEligible++;
      if (ballot.vote !== Vote.Unspecified) proposalVoted++;
    }

    if (proposalEligible === 0) continue;

    eligible += proposalEligible;
    voted += proposalVoted;
    participation.push({ proposalId: proposal.id, voted: proposalVoted === proposalEligible });
  }

  if (eligible === 0) return null;

  participation.sort((a, b) => (a.proposalId < b.proposalId ? -1 : 1));

  return { rate: voted / eligible, proposals: participation };
};
