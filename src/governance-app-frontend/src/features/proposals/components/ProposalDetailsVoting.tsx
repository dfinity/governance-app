import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCircle, CircleCheckBig, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';

import { useVoting } from '../hooks/useVoting';
import { formatPercent, formatVotingPower } from '../utils';

type Props = {
  proposal: ProposalInfo;
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
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

  const { vote, isVoting, hasVoted, isVoteMixed, voteValue, canVote } = useVoting(proposal);

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
              {t(($) => $.proposal.yes)}: {formatPercent(yesProportion * 100)}
            </span>
            <span className="text-red-700 dark:text-red-400">
              {t(($) => $.proposal.no)}: {formatPercent(noProportion * 100)}
            </span>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={t(($) => $.proposal.voteProgress)}
            aria-valuenow={yes + no}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div className="absolute top-0 left-1/2 z-10 h-full w-0.5 -translate-x-1/2 bg-foreground/10" />
            <div
              className="absolute top-0 bottom-0 left-0 bg-emerald-800 transition-all duration-1000 ease-out dark:bg-emerald-400"
              style={{ width: `${isMounted ? yesProportion * 100 : 0}%` }}
            />
            <div
              className="absolute top-0 right-0 bottom-0 bg-red-800 transition-all duration-1000 ease-out dark:bg-red-400"
              style={{ width: `${isMounted ? noProportion * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.totalVotingPower)}
            </span>
            <span className="font-semibold">{formatVotingPower(total)}</span>
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
              {formatVotingPower(yes)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.noVotes)}
            </span>
            <span className="font-semibold text-red-800 dark:text-red-400">
              {formatVotingPower(no)}
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
                      <span className="text-muted-foreground">-</span>
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

              {canVote && !hasVoted && (
                <div className="col-span-1 mt-4 sm:col-span-3">
                  <div className="flex w-full items-center gap-3">
                    <Button
                      onClick={() => vote(Vote.Yes)}
                      disabled={isVoting}
                      variant="default"
                      size="sm"
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      aria-busy={isVoting}
                    >
                      {isVoting ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <ThumbsUp className="mr-2 h-4 w-4" />
                      )}
                      {t(($) => $.proposal.yes)}
                    </Button>
                    <Button
                      onClick={() => vote(Vote.No)}
                      disabled={isVoting}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      aria-busy={isVoting}
                    >
                      {isVoting ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <ThumbsDown className="mr-2 h-4 w-4" />
                      )}
                      {t(($) => $.proposal.no)}
                    </Button>
                  </div>
                </div>
              )}

              {hasVoted && (
                <div className="col-span-1 mt-4 sm:col-span-3">
                  <div
                    className={`flex w-full items-center gap-2 rounded-md border p-3 text-sm font-medium capitalize ${
                      isVoteMixed
                        ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : voteValue === Vote.Yes
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {isVoteMixed ? (
                      <>
                        <TriangleAlert className="size-4" />
                        <Trans
                          values={{ vote: t(($) => $.proposal.mixed) }}
                          i18nKey={($) => $.proposal.voteCast}
                          components={{ strong: <strong /> }}
                        />
                      </>
                    ) : voteValue === Vote.Yes ? (
                      <>
                        <CheckCircle className="size-4" />
                        <Trans
                          values={{ vote: t(($) => $.proposal.yes) }}
                          i18nKey={($) => $.proposal.voteCast}
                          components={{ strong: <strong /> }}
                        />
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-4" />
                        <Trans
                          values={{ vote: t(($) => $.proposal.no) }}
                          i18nKey={($) => $.proposal.voteCast}
                          components={{ strong: <strong /> }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
