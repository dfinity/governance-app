import { ProposalInfo, votableNeurons, Vote, votedNeurons } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { longNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

/**
 * Hook to manage voting on a proposal
 * @param proposal ProposalInfo
 * @returns
 *   - vote: function to cast votes for all eligible neurons
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
  const eligibleVotedNeurons = votedNeurons({ neurons, proposal });

  // Track votes
  const eligibleBallots = proposal.ballots.filter((b) => neuronIds.has(b.neuronId));
  const votedBallots = eligibleBallots.filter((b) => b.vote !== Vote.Unspecified);
  const votedCount = votedBallots.length;
  const hasVoted = votedCount > 0 && votedCount === eligibleVotedNeurons.length;

  // Mixed votes check
  const firstVote = votedBallots[0]?.vote;
  const isVoteMixed = hasVoted && !votedBallots.every((b) => b.vote === firstVote);
  const voteValue = hasVoted && !isVoteMixed ? firstVote : Vote.Unspecified;

  // Mutation
  const voteMutation = useMutation<
    void,
    Error,
    { neuronId: bigint; vote: Vote; current: number; total: number }
  >({
    mutationFn: async ({ neuronId, vote }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      await canister.registerVote({
        proposalId: proposal.id!,
        vote,
        neuronId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
      });
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
      });
    },
    retry: 3,
  });

  const isVoting = voteMutation.isPending;

  const vote = async (vote: Vote) => {
    if (!canister || eligibleCount === 0) return;

    for (let i = 0; i < eligibleCount; i++) {
      const neuronId = eligibleNeuronsIds[i];
      const current = i + 1;
      const total = eligibleCount;

      const promise = voteMutation.mutateAsync({
        neuronId,
        vote,
        current,
        total,
      });

      toast.promise(promise, {
        loading: t(($) => $.proposal.votingProgress.loading, {
          action:
            vote === Vote.Yes
              ? t(($) => $.proposal.actions.adopting)
              : t(($) => $.proposal.actions.rejecting),
          id: proposal.id,
          current,
          total,
        }),
        success: t(($) => $.proposal.votingProgress.success, {
          action:
            vote === Vote.Yes
              ? t(($) => $.proposal.actions.adopted)
              : t(($) => $.proposal.actions.rejected),
          id: proposal.id,
          current,
          total,
        }),
        error: t(($) => $.proposal.votingProgress.error, {
          id: proposal.id,
        }),
        ...longNotification,
      });

      try {
        await promise;
      } catch (e) {
        console.error(e);
      }
    }
  };

  useBlocker({
    shouldBlockFn: () => {
      if (!isVoting) return false;

      // @TODO: Improve UI
      window.alert(t(($) => $.proposal.confirmNavigation));
      return true;
    },
    enableBeforeUnload: isVoting,
  });

  return {
    vote,
    isVoting,
    hasVoted,
    isVoteMixed,
    voteValue,
    canVote: ready && authenticated && eligibleCount > 0,
    eligibleCount,
  };
};
