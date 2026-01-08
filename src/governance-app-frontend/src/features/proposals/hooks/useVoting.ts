import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { longNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

export const useVoting = (proposal: ProposalInfo) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister, ready, authenticated } = useNnsGovernance();

  // Neurons
  const { data: neurons } = useGovernanceNeurons();
  const userNeurons = neurons?.response ?? [];
  const neuronIds = new Set(userNeurons.map((n) => n.neuronId));

  // Determine eligible neurons (those in the ballot)
  const eligibleBallots = proposal.ballots.filter((b) => neuronIds.has(b.neuronId));
  const eligibleNeuronIds = eligibleBallots.map((b) => b.neuronId);
  const eligibleCount = eligibleNeuronIds.length;

  // Track votes
  const votedBallots = eligibleBallots.filter((b) => b.vote !== Vote.Unspecified);
  const votedCount = votedBallots.length;
  const hasVoted = votedCount > 0 && votedCount === eligibleCount;

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
    // We handle success/error in the loop for progress updates, or globally?
    // Let's use toast.promise in the handler instead of mutation callbacks for granular control
  });

  const vote = async (vote: Vote) => {
    if (!canister || eligibleCount === 0) return;

    // Filter neurons that haven't voted yet, or override?
    // "if they click no, then all neurons vote the same way" implies we vote with ALL eligible neurons to enforce consistency.
    // However, re-voting might not be allowed depending on config, but usually is allowed to flip votes.
    // Let's iterate over ALL eligible neurons to ensure they all match the new vote.

    for (let i = 0; i < eligibleCount; i++) {
      const neuronId = eligibleNeuronIds[i];
      const current = i + 1;

      const promise = voteMutation.mutateAsync({
        neuronId,
        vote,
        current,
        total: eligibleCount,
      });

      // We want a toast that updates? Or individual toasts?
      // User asked: "adopting proposal ... 1/3"
      // toast.promise is good for a single action. If we have multiple, it might spam.
      // A better approach for "progress" is a single toast that we update, or just letting the last one show?
      // Let's try `toast.promise` but with a unique ID if possible, or just sequential.
      // Actually, `toast.promise` typically handles the lifecycle of *one* promise.
      // If we want "1/3", then "2/3", we can chain them.

      toast.promise(promise, {
        loading: t(($) => $.proposal.votingProgress.loading, {
          action:
            vote === Vote.Yes
              ? t(($) => $.proposal.actions.adopting)
              : t(($) => $.proposal.actions.rejecting),
          id: proposal.id,
          current,
          total: eligibleCount,
        }),
        success: t(($) => $.proposal.votingProgress.success, {
          action:
            vote === Vote.Yes
              ? t(($) => $.proposal.actions.adopted)
              : t(($) => $.proposal.actions.rejected),
          id: proposal.id,
          current,
          total: eligibleCount,
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
        // Continue or break? Usually continue to try others.
      }
    }

    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
    });
    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
    });
  };

  // Block navigation while voting
  const isVoting = voteMutation.isPending;
  useBlocker({
    shouldBlockFn: () => {
      if (!isVoting) return false;
      return !window.confirm(t(($) => $.common.confirmNavigation));
    },
  });

  /*
   * Returns:
   * - vote: function to cast votes for all eligible neurons
   * - isVoting: boolean
   * - hasVoted: boolean (all eligible neurons have voted and are consistent? No, just that they have voted)
   * - isVoteMixed: boolean
   * - voteValue: Vote.Yes | Vote.No | Vote.Unspecified (if mixed or not voted)
   * - canVote: boolean (user has eligible neurons and is ready)
   */

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
