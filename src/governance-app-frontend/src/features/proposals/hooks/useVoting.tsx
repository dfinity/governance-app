import { ProposalInfo, Topic, votableNeurons, Vote } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';
import { useLedgerNeuronCall } from '@features/stakes/hooks/useLedgerNeuronCall';
import { useLedgerSignerPrincipals } from '@features/stakes/hooks/useNeuronSigner';

import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { isDeviceActionCancelled } from '@hooks/useDeviceAction';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { isUserControllerOrHotkey } from '@utils/neuron';
import { ephemeralNotification } from '@utils/notification';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { isNeuronControlledByLedger } from '@common/ledger/signer';

/**
 * Hook to manage voting on a proposal
 *
 * The neurons that the Internet Identity session can vote for (controller or hotkey) vote in
 * parallel. The eligible neurons that a registered Ledger device controls, and that have no
 * Internet Identity access, vote with the device after them, one approval at a time. A cancel
 * on the approval dialog stops the remaining device votes and keeps the votes already cast.
 *
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
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText();
  const ledgerPrincipals = useLedgerSignerPrincipals();
  const runLedgerCall = useLedgerNeuronCall();

  // Neurons
  const neuronsQuery = useGovernanceNeurons();
  const neurons = neuronsQuery.data?.response ?? [];
  const neuronIds = new Set(neurons.map((n) => n.neuronId));

  // Determine eligible neurons (those in the ballot)
  const eligibleNeurons = votableNeurons({ neurons, proposal });
  const eligibleCount = eligibleNeurons.length;

  // The device signs only where the session has no access of its own.
  const deviceVotes = eligibleNeurons.flatMap((neuron) => {
    const controller = neuron.fullNeuron?.controller;
    const sessionCanVote = isUserControllerOrHotkey({ neuron, principalId });

    return controller && !sessionCanVote && isNeuronControlledByLedger({ neuron, ledgerPrincipals })
      ? [{ neuronId: neuron.neuronId, principal: controller }]
      : [];
  });
  const deviceNeuronIds = new Set(deviceVotes.map((v) => v.neuronId));
  const sessionNeuronIds = eligibleNeurons
    .map((n) => n.neuronId)
    .filter((neuronId) => !deviceNeuronIds.has(neuronId));

  // Track votes
  const eligibleBallots = proposal.ballots.filter((b) => neuronIds.has(b.neuronId));
  const votedBallots = eligibleBallots.filter((b) => b.vote !== Vote.Unspecified);
  const votedCount = votedBallots.length;
  const hasVoted = votedCount > 0 && eligibleCount === 0;

  // Mixed votes check
  const firstVote = votedBallots[0]?.vote;
  const isVoteMixed = hasVoted && !votedBallots.every((b) => b.vote === firstVote);
  const voteValue = hasVoted && !isVoteMixed ? firstVote : Vote.Unspecified;

  // Mutation - parallel voting with the session, then one device vote at a time
  const voteMutation = useMutation<void[], Error, { vote: Vote }>({
    mutationFn: ({ vote }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      // Execute all session votes in parallel
      const promises = sessionNeuronIds.map((neuronId) =>
        canister.registerVote({
          proposalId: proposal.id!,
          vote,
          neuronId,
        }),
      );

      const voteWithDevice = async ({ neuronId, principal }: (typeof deviceVotes)[number]) =>
        runLedgerCall(
          (deviceCanister) =>
            deviceCanister.registerVote({
              proposalId: proposal.id!,
              vote,
              neuronId,
            }),
          {
            principal,
            action: 'vote',
            description: t(($) => $.common.ledgerApproval.vote),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.proposal, { proposalId: String(proposal.id) }),
                  vote === Vote.Yes
                    ? t(($) => $.common.ledgerApproval.voteYes)
                    : t(($) => $.common.ledgerApproval.voteNo),
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(neuronId) }),
                ]}
              />
            ),
          },
        );

      // The device votes start after the session votes and run one by one. A cancel or a
      // device error stops the ones left.
      const votingPromise = Promise.all(promises).then(async (results) => {
        for (const deviceVote of deviceVotes) {
          await voteWithDevice(deviceVote);
        }
        return results;
      });

      const successAction =
        vote === Vote.Yes
          ? t(($) => $.proposal.actions.adopted)
          : t(($) => $.proposal.actions.rejected);

      // We chain the invalidation to the voting promise so that:
      // 1. The toast loading state persists until invalidation is done.
      // 2. The mutation isPending state persists until invalidation is done.
      // This ensures the UI updates (hasVoted becomes true) at the same time the spinner stops.
      const refresh = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
          }),
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
          }),
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.NNS_GOVERNANCE.ENGAGEMENT],
          }),
        ]).catch(failedRefresh);

      const extendedPromise = votingPromise.then(
        async (res) => {
          await refresh();
          return res;
        },
        async (error: unknown) => {
          // The votes cast before the failure stay in place, so the ballots refresh too.
          await refresh();
          throw error;
        },
      );

      toast.promise(extendedPromise, {
        loading: t(($) => $.proposal.votingProgress.loading, {
          id: proposal.id,
        }),
        success: t(($) => $.proposal.votingProgress.success, {
          action: successAction,
          id: proposal.id,
        }),
        error: (error: unknown) =>
          isDeviceActionCancelled(error)
            ? t(($) => $.proposal.votingProgress.cancelled, { id: proposal.id })
            : t(($) => $.proposal.votingProgress.error, { id: proposal.id }),
        ...ephemeralNotification,
      });

      return extendedPromise;
    },
    onSuccess: (_, { vote }) => {
      analytics.event(AnalyticsEvent.VotingCastVote, {
        vote: vote === Vote.Yes ? 'yes' : 'no',
        topic: Topic[proposal.topic] ?? 'unknown',
      });
    },
    onError: (error, { vote }) => {
      console.error(error);
      analytics.event(AnalyticsEvent.VotingCastVoteError, {
        vote: vote === Vote.Yes ? 'yes' : 'no',
        topic: Topic[proposal.topic] ?? 'unknown',
        reason: getErrorReason(error),
      });
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
