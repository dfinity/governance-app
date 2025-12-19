import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { ProposalInfo, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { CheckCircle, Clock, Tag, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardFooter, CardHeader } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { VOTING_RESULTS_PRECISION } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { bigIntDiv } from '@utils/bigInt';

type Props = {
  proposal: ProposalInfo;
  canUserVote: boolean;
  certified?: boolean;
};

export function ProposalListItem({ proposal, canUserVote, certified }: Props) {
  const { t } = useTranslation();

  const { data: neurons } = useGovernanceNeurons();

  // Yes/No vote status
  const { yes, no, total } = proposal.latestTally || {};
  const yesPercent =
    nonNullish(yes) && nonNullish(total) && total > 0n
      ? bigIntDiv(yes, total, VOTING_RESULTS_PRECISION) * 100
      : 0;
  const noPercent =
    nonNullish(no) && nonNullish(total) && total > 0n
      ? bigIntDiv(no, total, VOTING_RESULTS_PRECISION) * 100
      : 0;

  // Time left
  const now = Date.now() / 1000;
  const deadline = Number(proposal.deadlineTimestampSeconds ?? 0n);
  const timeLeftSeconds = BigInt(Math.floor(Math.max(deadline - now, 0)));
  const timeLeft = secondsToDuration({
    seconds: timeLeftSeconds,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const status = proposal.status;
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  // TODO: Add mutations
  // My votes
  const myVotingNeurons =
    proposal.ballots.filter((b) => {
      const n = neurons?.response.find((neuron) => neuron.neuronId === b.neuronId);
      return !!n;
    }) ?? [];

  const myVotes = myVotingNeurons.filter((b) => b.vote !== Vote.Unspecified);
  const hasVoted = myVotes.length > 0;
  const voteValue = hasVoted ? myVotes[0].vote : Vote.Unspecified;

  const statusColor =
    status === ProposalStatus.Open
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100/80'
      : status === ProposalStatus.Executed
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100/80';

  return (
    <Link to="/voting/proposals/$id" params={{ id: proposal.id! }} className="w-full">
      <Card className="flex flex-col overflow-hidden transition-colors hover:bg-accent/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              {t(($) => $.proposal.proposalId, { id: proposal.id })}
            </span>
            <CertifiedBadge certified={certified} />
          </div>

          <h3 className="text-lg leading-tight font-bold decoration-primary underline-offset-4">
            {proposal.proposal?.title}
          </h3>

          <div className="flex flex-col gap-2 text-xs lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className={statusColor}>{ProposalStatus[status]}</Badge>
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
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                {yesPercent.toFixed(1)}%
              </span>
              <div className="relative h-2 flex-grow overflow-hidden rounded-full bg-secondary">
                <div className="absolute top-0 left-1/2 z-10 h-full w-0.5 -translate-x-1/2 bg-foreground/80" />
                <div
                  className="absolute top-0 bottom-0 left-0 bg-green-500 transition-all duration-4000 ease-out"
                  style={{ width: `${isMounted ? yesPercent : 0}%` }}
                />
                <div
                  className="absolute top-0 right-0 bottom-0 bg-red-500 transition-all duration-4000 ease-out"
                  style={{ width: `${isMounted ? noPercent : 0}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                {noPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardHeader>

        {(canUserVote || hasVoted) && (
          <CardFooter className="pt-2 pb-4">
            {hasVoted ? (
              <div className="flex w-full items-center gap-2 rounded-md border border-green-200 bg-green-100 p-3 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {voteValue === Vote.Yes ? <ThumbsUp /> : <ThumbsDown />}
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center gap-3">
                <Button
                  onClick={() => {}}
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                </Button>
                <Button onClick={() => {}} variant="destructive" size="sm" className="flex-1">
                  <ThumbsDown className="mr-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}
