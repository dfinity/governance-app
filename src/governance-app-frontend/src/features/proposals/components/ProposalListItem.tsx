import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { ProposalInfo, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCircle, Clock, Tag, ThumbsDown, ThumbsUp } from 'lucide-react';
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
  const { identity } = useInternetIdentity();

  const { data: neurons } = useGovernanceNeurons();
  const votingNeurons =
    proposal.ballots.filter((b) => {
      const n = neurons?.response.find((neuron) => neuron.neuronId === b.neuronId);
      return !!n;
    }) ?? [];

  const myVotingNeurons = votingNeurons.filter((b) =>
    neurons?.response.some((n) => n.neuronId === b.neuronId),
  );

  // Check if I have voted with at least one neuron? Or all?
  // User wanted "Vote cast: Yes/No".
  // Let's see if *any* of my neurons voted.
  const myVotes = myVotingNeurons.filter((b) => b.vote !== Vote.Unspecified);
  const hasVoted = myVotes.length > 0;
  // If mixed votes, we prioritize showing we voted.
  // Ideally, show what the majority of my stake voted for, but for now simple check.
  const voteValue = hasVoted ? myVotes[0].vote : Vote.Unspecified;

  const { yes, total } = proposal.latestTally || {};
  const yesPercent =
    nonNullish(yes) && nonNullish(total) && total > 0n
      ? (bigIntDiv(yes, total, VOTING_RESULTS_PRECISION) * 100).toFixed(0)
      : '0';

  // Time left
  const now = Date.now() / 1000;
  const deadline = Number(proposal.deadlineTimestampSeconds ?? 0n);
  const timeLeftSeconds = BigInt(Math.floor(Math.max(deadline - now, 0)));
  const timeLeft = secondsToDuration({
    seconds: timeLeftSeconds,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const status = proposal.status;
  const statusColor =
    status === ProposalStatus.Open
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100/80'
      : status === ProposalStatus.Executed
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100/80';

  return (
    <Link to="/voting/proposals/$id" params={{ id: proposal.id! }} className="w-full">
      <Card className="flex flex-col overflow-hidden transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Proposal #{proposal.id?.toString()}
            </span>
            <CertifiedBadge certified={certified} />
          </div>

          <h3 className="mb-2 text-lg leading-tight font-bold decoration-primary underline-offset-4">
            {proposal.proposal?.title}
          </h3>

          <div className="flex flex-wrap gap-1 text-xs">
            <Badge className={statusColor}>{ProposalStatus[status]}</Badge>
            {timeLeft.length > 0 && (
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <Clock className="h-3.5 w-3.5" />
                {timeLeft} left
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <CheckCircle className="h-3.5 w-3.5" />
              {yesPercent}% Yes
            </Badge>
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Tag className="h-3.5 w-3.5" />
              {Topic[proposal.topic]}
            </Badge>
          </div>
        </CardHeader>

        {identity && (canUserVote || hasVoted) && (
          <CardFooter className="pt-2 pb-4">
            {hasVoted ? (
              <div className="flex w-full items-center gap-2 rounded-md border border-green-200 bg-green-100 p-3 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Vote cast: {voteValue === Vote.Yes ? 'Yes' : 'No'}
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
                  <ThumbsUp className="mr-2 h-4 w-4" /> Adopt
                </Button>
                <Button onClick={() => {}} variant="destructive" size="sm" className="flex-1">
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}
