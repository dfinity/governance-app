import { ProposalInfo, Vote } from '@dfinity/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';

import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useNnsGovernanceCanister } from '@hooks/canisters/governance/useGovernanceCanister';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import { bigIntDiv } from '@utils/bigInt';
import { QUERY_KEYS } from '@utils/queryKeys';

type Props = {
  proposal: ProposalInfo;
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Voting data.
  const { data: neurons } = useGovernanceGetNeurons();
  const votingNeurons =
    proposal.ballots.toSorted((a, b) => Number(a.neuronId) - Number(b.neuronId)) ?? [];
  const votingNeuronsId = new Set<bigint>(votingNeurons.map((neuron) => neuron.neuronId));
  const ineligibleNeurons =
    neurons?.response
      .filter((neuron) => !votingNeuronsId.has(neuron.neuronId))
      .toSorted((a, b) => Number(a.neuronId) - Number(b.neuronId)) ?? [];

  const voted = proposal.ballots.filter((neuron) => neuron.vote !== Vote.Unspecified).length;
  const totalToVote = proposal.ballots.length;

  const { yes, no, total } = proposal.latestTally || {};
  const hasVotingData = yes !== undefined && no !== undefined && total !== undefined;

  // Vote casting.
  const { ready, canister, authenticated } = useNnsGovernanceCanister();
  const [pending, setPending] = useState(new Set<bigint>());
  const canTriggerVote = ready && authenticated;
  const voteMutation = useMutation({
    mutationFn: canister!.registerVote,
    onSuccess: () => {
      setPending((p) => {
        const newSet = new Set(p);
        newSet.delete(proposal.id!);
        return newSet;
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL, proposal.id?.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS],
      });
    },
  });
  const castVote = (neuronId: bigint, vote: Vote) => {
    setPending((p) => new Set(p).add(neuronId));
    voteMutation.mutate({ proposalId: proposal.id!, vote, neuronId });
  };

  if (!identity) return null;

  return (
    <div className="mb-4 rounded-lg border p-4 text-secondary">
      <p className="mb-2 font-bold">
        {t(($) => $.proposal.voting, { voted, total: totalToVote })}
        {voted === totalToVote ? ' 🎉' : ''}
      </p>
      <div className="inline-grid gap-1 sm:grid-cols-[max-content_max-content_max-content] sm:gap-3">
        {votingNeurons.map((neuron) => (
          <Fragment key={neuron.neuronId}>
            <pre className="mt-4 rounded bg-amber-50 px-2 text-black sm:mt-0">
              #{neuron.neuronId}
            </pre>
            <span>
              {t(($) => $.common.votingPower)}: {neuron.votingPower}
            </span>
            <span>
              {t(($) => $.common.vote)}: {neuron.vote !== Vote.Unspecified && Vote[neuron.vote]}{' '}
              {neuron.vote === Vote.Yes ? '👍' : neuron.vote === Vote.No ? '👎' : ''}{' '}
              {neuron.vote === Vote.Unspecified && (
                <span className="inline-flex gap-2">
                  {pending.has(neuron.neuronId) ? (
                    <SkeletonLoader width={90} height={20} />
                  ) : (
                    <>
                      <button
                        onClick={() => castVote(neuron.neuronId, Vote.Yes)}
                        className="rounded bg-green-100 px-2 text-black"
                        disabled={!canTriggerVote}
                        type="button"
                      >
                        {t(($) => $.common.yes)}
                      </button>
                      <button
                        onClick={() => castVote(neuron.neuronId, Vote.No)}
                        className="rounded bg-red-100 px-2 text-black"
                        disabled={!canTriggerVote}
                        type="button"
                      >
                        {t(($) => $.common.no)}
                      </button>
                    </>
                  )}
                </span>
              )}
            </span>
          </Fragment>
        ))}
        {ineligibleNeurons.map((neuron) => (
          <Fragment key={neuron.neuronId}>
            <span className="text-gray-500">#{neuron.neuronId}</span>
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
              {t(($) => $.common.yes)}: {bigIntDiv(yes, total, 6).toFixed(6)}%
            </span>
            <span>
              {t(($) => $.common.no)}: {bigIntDiv(no, total, 6).toFixed(6)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
