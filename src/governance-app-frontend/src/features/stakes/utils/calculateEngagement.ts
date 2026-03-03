import type { NeuronInfo, ProposalInfo } from '@icp-sdk/canisters/nns';
import { Vote } from '@icp-sdk/canisters/nns';

export type EngagementResult = {
  rate: number;
  participated: number;
  total: number;
} | null;

export const calculateEngagement = (
  neurons: NeuronInfo[] | undefined,
  proposals: ProposalInfo[] | undefined,
): EngagementResult => {
  if (!neurons?.length || !proposals?.length) return null;

  const neuronIds = new Set(neurons.map((n) => n.neuronId));

  let eligible = 0;
  let voted = 0;

  for (const proposal of proposals) {
    for (const ballot of proposal.ballots) {
      if (!neuronIds.has(ballot.neuronId)) continue;
      eligible++;
      if (ballot.vote !== Vote.Unspecified) voted++;
    }
  }

  if (eligible === 0) return null;

  return {
    rate: voted / eligible,
    participated: voted,
    total: eligible,
  };
};
