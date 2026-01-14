import { secondsToDuration } from '@dfinity/utils';
import { ProposalInfo, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import {
  CheckCircle,
  Clock,
  Loader2,
  Tag,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardFooter, CardHeader } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { E8S } from '@constants/extra';
import { formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { useVoting } from '../hooks/useVoting';
import { getProposalStatusColor, getProposalTimeLeftInSeconds } from '../utils';

type Props = {
  proposal: ProposalInfo;
  certified?: boolean;
};

export function ProposalListItem({ proposal, certified }: Props) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [votedBallot, setVotedBallot] = useState<Vote.No | Vote.Yes | undefined>();

  const yes = Number(proposal.latestTally?.yes ?? 0n) / E8S;
  const no = Number(proposal.latestTally?.no ?? 0n) / E8S;
  const total = Number(proposal.latestTally?.total ?? 0n) / E8S;

  const yesProportion = total > 0 ? yes / total : 0;
  const noProportion = total > 0 ? no / total : 0;

  const timeLeft = secondsToDuration({
    seconds: getProposalTimeLeftInSeconds(proposal),
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });
  const statusColor = getProposalStatusColor(proposal);

  const { vote, isVoting, hasVoted, isVoteMixed, voteValue, canVote } = useVoting(proposal);

  const voteHandler = (
    ballot: Vote.Yes | Vote.No,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setVotedBallot(ballot);
    vote(ballot);
  };

  useEffect(() => {
    if (!isVoting) {
      setVotedBallot(undefined);
    }
  }, [isVoting]);

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  return (
    <Card
      className={cn(
        'flex w-full flex-col overflow-hidden transition-colors hover:bg-accent/50',
        isVoting && 'pointer-events-none opacity-70',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            {t(($) => $.proposal.proposalId, { id: proposal.id })}
          </span>
          <CertifiedBadge certified={certified} />
        </div>

        <h3 className="min-w-0 text-lg leading-tight font-bold break-words decoration-primary underline-offset-4">
          {proposal.proposal?.title}
        </h3>

        <div className="flex flex-col gap-2 text-xs lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className={statusColor}>{ProposalStatus[proposal.status]}</Badge>
            {timeLeft.length > 0 && (
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <Clock className="h-3.5 w-3.5" />
                {t(($) => $.proposal.timeLeft, { timeLeft })}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Tag className="h-3.5 w-3.5" />
              {Topic[proposal.topic]}
            </Badge>
          </div>

          <div className="flex w-full min-w-[200px] flex-1 items-center gap-2 lg:ml-auto lg:w-auto lg:max-w-[500px]">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
              {formatPercentage(yesProportion)}
            </span>
            <div
              className="relative h-2 flex-grow overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label={t(($) => $.proposal.voteProgress)}
              aria-valuenow={yes + no}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <div className="absolute top-0 left-1/2 z-10 h-full w-0.5 -translate-x-1/2 bg-foreground/10" />
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-800 transition-all duration-4000 ease-out dark:bg-emerald-400"
                style={{ width: `${isMounted ? yesProportion * 100 : 0}%` }}
              />
              <div
                className="absolute top-0 right-0 bottom-0 bg-red-800 transition-all duration-4000 ease-out dark:bg-red-400"
                style={{ width: `${isMounted ? noProportion * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-red-800 dark:text-red-400">
              {formatPercentage(noProportion)}
            </span>
          </div>
        </div>
      </CardHeader>

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
                {isVoting && votedBallot === Vote.Yes ? (
                  <Loader2 className="size-4 animate-spin" />
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
                {isVoting && votedBallot === Vote.No ? (
                  <Loader2 className="size-4 animate-spin" />
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
}
