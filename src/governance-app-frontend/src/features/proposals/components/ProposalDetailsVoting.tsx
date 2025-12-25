import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CircleCheckBig, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';
import { setWithItemAdded, setWithItemRemoved } from '@utils/set';

import { formatPercent, formatVotingPower } from '../utils';

type Props = {
  proposal: ProposalInfo;
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  const yes = Number(proposal.latestTally?.yes ?? 0n) / E8S;
  const no = Number(proposal.latestTally?.no ?? 0n) / E8S;
  const total = Number(proposal.latestTally?.total ?? 0n) / E8S;

  const yesProportion = total > 0 ? yes / total : 0;
  const noProportion = total > 0 ? no / total : 0;
  const totalProportion = yesProportion + noProportion;

  // Voting data.
  const { data: neurons, isLoading: isLoadingNeurons } = useGovernanceNeurons();
  const votingNeurons =
    proposal.ballots.toSorted((a, b) => {
      const fullA = neurons?.response.find((n) => n.neuronId === a.neuronId);
      const fullB = neurons?.response.find((n) => n.neuronId === b.neuronId);
      return Number(
        (fullB?.createdTimestampSeconds ?? 0n) - (fullA?.createdTimestampSeconds ?? 0n),
      );
    }) ?? [];
  const votingNeuronIds = new Set<bigint>(votingNeurons.map((neuron) => neuron.neuronId));
  const ineligibleNeurons =
    neurons?.response.filter((neuron) => !votingNeuronIds.has(neuron.neuronId)) ?? [];

  const voted = proposal.ballots.filter((neuron) => neuron.vote !== Vote.Unspecified).length;
  const totalToVote = proposal.ballots.length;

  // @TODO: Vote casting.
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

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  if (!identity) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{t(($) => $.proposal.votingStatus)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-emerald-800 dark:text-emerald-400">
              {t(($) => $.common.yes)}: {formatPercent(yesProportion * 100)}
            </span>
            <span className="text-red-700 dark:text-red-400">
              {t(($) => $.common.no)}: {formatPercent(noProportion * 100)}
            </span>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={t(($) => $.proposal.voteProgress)}
            aria-valuenow={yes}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div className="absolute top-0 left-1/2 z-10 h-full w-0.5 -translate-x-1/2 bg-foreground/10" />
            <div
              className="absolute top-0 bottom-0 left-0 bg-emerald-800 transition-all duration-1000 ease-out dark:bg-emerald-400"
              style={{ width: formatPercent(isMounted ? yesProportion * 100 : 0) }}
            />
            <div
              className="absolute top-0 right-0 bottom-0 bg-red-700 transition-all duration-1000 ease-out dark:bg-red-400"
              style={{ width: formatPercent(isMounted ? noProportion * 100 : 0) }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.totalVotingPower)}
            </span>
            <span className="font-semibold">{formatVotingPower(total ?? 0n)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.participation)}
            </span>
            <span className="font-semibold">{formatPercent(totalProportion * 100)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.yesVotes)}
            </span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              {formatVotingPower(yes ?? 0n)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.noVotes)}
            </span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {formatVotingPower(no ?? 0n)}
            </span>
          </div>
        </div>

        {/* @TODO: My Votes Section */}
        {totalToVote > 0 && (
          <div className="rounded-lg border p-4">
            <p className="mb-2 flex items-center gap-2 font-bold">
              {t(($) => $.proposal.voting, { voted, total: totalToVote })}
              {voted === totalToVote ? <CircleCheckBig color="green" size={16} /> : ''}
            </p>
            <div className="inline-grid items-center gap-1 sm:grid-cols-[max-content_max-content_max-content] sm:gap-3">
              {isLoadingNeurons && <SkeletonLoader count={4} />}
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
                              variant="outline"
                              type="button"
                            >
                              {t(($) => $.common.yes)}
                            </Button>
                            <Button
                              onClick={() => castVote(neuron.neuronId, Vote.No)}
                              variant="outline"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
