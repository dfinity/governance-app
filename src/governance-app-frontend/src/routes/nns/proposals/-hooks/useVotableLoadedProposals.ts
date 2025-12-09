import {
  ProposalRewardStatus,
  ProposalStatus,
  Topic,
  votableNeurons,
} from '@icp-sdk/canisters/nns';
import { useGovernanceNeurons, useGovernanceProposals } from '@hooks/canisters/governance';

/**
 * Returns a set of proposal IDs that the user can vote on based on their neurons.
 * This function will not load new proposals but rather go through the loaded data and check if they can be voted
 **/
export function useVotableLoadedProposals() {
  const { data: neuronsData } = useGovernanceNeurons();
  const { data: proposalsData } = useGovernanceProposals();

  if (neuronsData?.response?.length === 0) return new Set<bigint>();

  const proposals = proposalsData?.pages?.flatMap((page) => page?.response.proposals) ?? [];

  const acceptVotesProposals = proposals.filter(
    (proposal) => proposal.rewardStatus === ProposalRewardStatus.AcceptVotes,
  );
  // Request Neuron Management proposals that are open and have an ineligible reward
  // status because they don't have rewards (not ProposalRewardStatus.AcceptVotes),
  // but are still votable.
  // Only users which are listed explicitly in the followees of a Neuron Management proposal will get to
  // see such a proposal in the query response. So for most users the response will be empty.
  const neuronManagementProposals = proposals.filter(
    (proposal) =>
      proposal.topic === Topic.NeuronManagement &&
      proposal.rewardStatus === ProposalRewardStatus.Ineligible &&
      proposal.status === ProposalStatus.Open,
  );

  const votableProposals = [...acceptVotesProposals, ...neuronManagementProposals];
  return new Set(
    votableProposals
      .filter(
        (proposal) => votableNeurons({ neurons: neuronsData?.response || [], proposal }).length > 0,
      )
      .map((p) => p.id),
  );
}
