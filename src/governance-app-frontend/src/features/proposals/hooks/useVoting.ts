import { ProposalInfo, votableNeurons, Vote } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { ephemeralNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

/**
 * Hook to manage voting on a proposal
 * @param proposal ProposalInfo
 * @returns
 *   - vote: function to cast votes for all eligible neurons in parallel
 *   - isVoting: boolean
 *   - hasVoted: boolean - indicates whether all eligible neurons have cast their votes
 *   - isVoteMixed: boolean
 *   - voteValue: Vote.Yes | Vote.No | Vote.Unspecified (if mixed or not voted)
 *   - canVote: boolean
 */
export const useVoting = (proposal: ProposalInfo) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister, ready, authenticated } = useNnsGovernance();

  // Neurons
  const neuronsQuery = useGovernanceNeurons();
  const neurons = neuronsQuery.data?.response ?? [];
  const neuronIds = new Set(neurons.map((n) => n.neuronId));

  // Determine eligible neurons (those in the ballot)
  const eligibleNeurons = votableNeurons({ neurons, proposal });
  const eligibleNeuronsIds = eligibleNeurons.map((n) => n.neuronId);
  const eligibleCount = eligibleNeurons.length;

  // Track votes
  const eligibleBallots = proposal.ballots.filter((b) => neuronIds.has(b.neuronId));
  const votedBallots = eligibleBallots.filter((b) => b.vote !== Vote.Unspecified);
  const votedCount = votedBallots.length;
  const hasVoted = votedCount > 0 && eligibleCount === 0;

  // Mixed votes check
  const firstVote = votedBallots[0]?.vote;
  const isVoteMixed = hasVoted && !votedBallots.every((b) => b.vote === firstVote);
  const voteValue = hasVoted && !isVoteMixed ? firstVote : Vote.Unspecified;

  // Mutation - parallel voting for all eligible neurons
  const voteMutation = useMutation<void[], Error, { vote: Vote }>({
    mutationFn: ({ vote }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      // Execute all votes in parallel
      const promises = eligibleNeuronsIds.map((neuronId) =>
        canister.registerVote({
          proposalId: proposal.id!,
          vote,
          neuronId,
        }),
      );

      const votingPromise = Promise.all(promises);

      const successAction =
        vote === Vote.Yes
          ? t(($) => $.proposal.actions.adopted)
          : t(($) => $.proposal.actions.rejected);

      // We chain the invalidation to the voting promise so that:
      // 1. The toast loading state persists until invalidation is done.
      // 2. The mutation isPending state persists until invalidation is done.
      // This ensures the UI updates (hasVoted becomes true) at the same time the spinner stops.
      const extendedPromise = votingPromise.then(async (res) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
          }),
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
          }),
        ]);
        return res;
      });

      toast.promise(extendedPromise, {
        loading: t(($) => $.proposal.votingProgress.loading, {
          id: proposal.id,
        }),
        success: t(($) => $.proposal.votingProgress.success, {
          action: successAction,
          id: proposal.id,
        }),
        error: t(($) => $.proposal.votingProgress.error, {
          id: proposal.id,
        }),
        ...ephemeralNotification,
      });

      return extendedPromise;
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const isVoting = voteMutation.isPending;

  const vote = (ballot: Vote) => {
    if (!canister || eligibleCount === 0) return;
    voteMutation.mutate({ vote: ballot });
  };

  return {
    vote,
    isVoting,
    hasVoted,
    isVoteMixed,
    voteValue,
    canVote: ready && authenticated && eligibleCount > 0,
  };
};
