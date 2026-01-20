import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCircle, Loader2, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@components/Card';
import { E8S } from '@constants/extra';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { useVoting } from '../hooks/useVoting';

type Props = {
  proposal: ProposalInfo;
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [votingFor, setVotingFor] = useState<Vote.No | Vote.Yes | undefined>();

  const yes = Number(proposal.latestTally?.yes ?? 0n) / E8S;
  const no = Number(proposal.latestTally?.no ?? 0n) / E8S;
  const total = Number(proposal.latestTally?.total ?? 0n) / E8S;

  const yesProportion = total > 0 ? yes / total : 0;
  const noProportion = total > 0 ? no / total : 0;
  const totalProportion = yesProportion + noProportion;

  const { vote, isVoting, hasVoted, isVoteMixed, voteValue, canVote } = useVoting(proposal);

  const voteHandler = (
    ballot: Vote.Yes | Vote.No,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setVotingFor(ballot);
    vote(ballot);
  };

  useEffect(() => {
    if (!isVoting) {
      setVotingFor(undefined);
    }
  }, [isVoting]);

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
              {t(($) => $.proposal.yes)}: {formatPercentage(yesProportion)}
            </span>
            <span className="text-red-700 dark:text-red-400">
              {t(($) => $.proposal.no)}: {formatPercentage(noProportion)}
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
            <span className="font-semibold">
              {formatNumber(total, {
                minFraction: 0,
                maxFraction: 0,
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.participation)}
            </span>
            <span className="font-semibold">{formatPercentage(totalProportion)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.yesVotes)}
            </span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              {formatNumber(yes, { minFraction: 0, maxFraction: 0 })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {t(($) => $.proposal.noVotes)}
            </span>
            <span className="font-semibold text-red-800 dark:text-red-400">
              {formatNumber(no, { minFraction: 0, maxFraction: 0 })}
            </span>
          </div>
        </div>
      </CardContent>

      {(canVote || hasVoted) && (
        <CardFooter className="py-2">
          {hasVoted ? (
            <div
              className={cn(
                'flex w-full items-center gap-2 rounded-md border p-2 text-sm capitalize',
                isVoteMixed
                  ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : voteValue === Vote.Yes
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
              )}
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
          ) : (
            <div className="flex w-full items-center gap-2">
              <Button
                aria-busy={isVoting}
                aria-label={t(($) => $.proposal.ariaLabelVote, {
                  vote: t(($) => $.proposal.yes),
                  proposalId: proposal.id?.toString(),
                })}
                className="flex-1 text-emerald-800 hover:border-emerald-700 hover:bg-emerald-100/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:border-emerald-300 dark:hover:bg-emerald-50/10 dark:hover:text-emerald-300"
                disabled={isVoting}
                onClick={(e) => voteHandler(Vote.Yes, e)}
                size="xl"
                variant="outline"
              >
                {isVoting && votingFor === Vote.Yes ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ThumbsUp className="mr-2 size-4" />
                )}
                {t(($) => $.proposal.yes)}
              </Button>
              <Button
                aria-busy={isVoting}
                aria-label={t(($) => $.proposal.ariaLabelVote, {
                  vote: t(($) => $.proposal.no),
                  proposalId: proposal.id?.toString(),
                })}
                className="flex-1 text-red-800 hover:border-red-700 hover:bg-red-100/10 hover:text-red-700 dark:text-red-400 dark:hover:border-red-300 dark:hover:bg-red-900/10 dark:hover:text-red-300"
                disabled={isVoting}
                onClick={(e) => voteHandler(Vote.No, e)}
                size="xl"
                variant="outline"
              >
                {isVoting && votingFor === Vote.No ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ThumbsDown className="mr-2 size-4" />
                )}
                {t(($) => $.proposal.no)}
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
