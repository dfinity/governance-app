import { ProposalInfo, Vote } from '@dfinity/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CircleCheckBig, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/components';

import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { VOTING_RESULTS_PRECISION } from '@constants/extra';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/canisters/governance';
import { bigIntDiv } from '@utils/bigInt';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';
import { setWithItemAdded, setWithItemRemoved } from '@utils/set';

type Props = {
  proposal: ProposalInfo;
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Voting data.
  const { data: neurons } = useGovernanceNeurons();
  const votingNeurons =
    proposal.ballots.toSorted((a, b) => Number(a.neuronId) - Number(b.neuronId)) ?? [];
  const votingNeuronIds = new Set<bigint>(votingNeurons.map((neuron) => neuron.neuronId));
  const ineligibleNeurons =
    neurons?.response.filter((neuron) => !votingNeuronIds.has(neuron.neuronId)) ?? [];

  const voted = proposal.ballots.filter((neuron) => neuron.vote !== Vote.Unspecified).length;
  const totalToVote = proposal.ballots.length;

  const { yes, no, total } = proposal.latestTally || {};
  const hasVotingData = yes !== undefined && no !== undefined && total !== undefined;

  // Vote casting.
  const { ready, canister, authenticated } = useNnsGovernance();
  const [pending, setPending] = useState(new Set<bigint>());
  const canTriggerVote = ready && authenticated;

  const voteMutation = useMutation<
    void,
    Error,
    Parameters<NonNullable<typeof canister>['registerVote']>[0]
  >({
    mutationFn: canister!.registerVote,
    onMutate: (args) => {
      setPending((s) => setWithItemAdded(s, args.neuronId));
    },
    onSuccess: (_, args) => {
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
        })
        .then(() => setPending((s) => setWithItemRemoved(s, args.neuronId)));
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
      });
      successNotification({
        description: t(($) => $.proposal.voteSuccess, {
          proposalId: proposal.id,
          neuronId: args.neuronId,
        }),
      });
    },
    onError: (_, args) => {
      setPending((s) => setWithItemRemoved(s, args.neuronId));
      errorNotification({
        description: t(($) => $.proposal.voteError, {
          proposalId: proposal.id,
          neuronId: args.neuronId,
        }),
      });
    },
  });

  const castVote = (neuronId: bigint, vote: Vote) =>
    voteMutation.mutate({ proposalId: proposal.id!, vote, neuronId });

  if (!identity) return null;

  return (
    <div className="mb-4 rounded-lg border p-4">
      <p className="mb-2 flex items-center gap-2 font-bold">
        {t(($) => $.proposal.voting, { voted, total: totalToVote })}
        {voted === totalToVote ? <CircleCheckBig color="green" size={16} /> : ''}
      </p>
      <div className="inline-grid items-center gap-1 sm:grid-cols-[max-content_max-content_max-content] sm:gap-3">
        {votingNeurons.map((neuron) => (
          <Fragment key={neuron.neuronId}>
            <pre className="mt-4 rounded bg-amber-50 px-2 text-black sm:mt-0">
              #{neuron.neuronId}
            </pre>
            <span>
              {t(($) => $.common.votingPower)}: {neuron.votingPower}
            </span>
            <span className="flex items-center gap-2">
              {t(($) => $.common.vote)}:{' '}
              {neuron.vote === Vote.Yes ? (
                <ThumbsUp size={16} color="green" />
              ) : neuron.vote === Vote.No ? (
                <ThumbsDown size={16} color="red" />
              ) : (
                ''
              )}{' '}
              {neuron.vote !== Vote.Unspecified && Vote[neuron.vote]}
              {neuron.vote === Vote.Unspecified && (
                <span className="inline-flex gap-2">
                  {pending.has(neuron.neuronId) ? (
                    <SkeletonLoader width={90} height={20} />
                  ) : (
                    <>
                      <Button
                        onClick={() => castVote(neuron.neuronId, Vote.Yes)}
                        disabled={!canTriggerVote}
                        color="secondary"
                        type="button"
                      >
                        {t(($) => $.common.yes)}
                      </Button>
                      <Button
                        onClick={() => castVote(neuron.neuronId, Vote.No)}
                        color="secondary"
                        type="button"
                      >
                        {t(($) => $.common.no)}
                      </Button>
                    </>
                  )}
                </span>
              )}
            </span>
          </Fragment>
        ))}
        {ineligibleNeurons.map((neuron) => (
          <Fragment key={neuron.neuronId}>
            <pre className="mt-4 rounded bg-amber-50 px-2 text-black sm:mt-0">
              #{neuron.neuronId}
            </pre>
            <span className="text-gray-500">
              {t(($) => $.common.votingPower)}: {neuron.votingPower}
            </span>
            <span className="text-gray-500">
              {t(($) => $.common.vote)}: {t(($) => $.proposal.ineligibleToVote)}
            </span>
          </Fragment>
        ))}
      </div>
      {hasVotingData && (
        <div className="mt-4">
          <p className="mb-2 font-bold">{t(($) => $.common.results)}</p>
          <p className="flex gap-2">
            <span>
              {t(($) => $.common.yes)}:{' '}
              {bigIntDiv(yes, total, VOTING_RESULTS_PRECISION).toFixed(VOTING_RESULTS_PRECISION)}%
            </span>
            <span>
              {t(($) => $.common.no)}:{' '}
              {bigIntDiv(no, total, VOTING_RESULTS_PRECISION).toFixed(VOTING_RESULTS_PRECISION)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
