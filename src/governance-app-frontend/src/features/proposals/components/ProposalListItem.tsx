import { ProposalInfo, ProposalStatus, Topic, Vote } from '@icp-sdk/canisters/nns';
import { secondsToDuration } from '@dfinity/utils';
import { CheckCircle, Clock, Tag, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardFooter, CardHeader } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';

import { formatPercent, getProposalStatusColor, getProposalTimeLeftInSeconds } from '../utils';

type Props = {
  proposal: ProposalInfo;
  canUserVote: boolean;
  certified?: boolean;
};

export function ProposalListItem({ proposal, canUserVote, certified }: Props) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  const { data: neurons } = useGovernanceNeurons();

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

  // TODO: Add mutations
  // My votes
  const myVotingBallots =
    proposal.ballots.filter((b) => {
      const n = neurons?.response.find((neuron) => neuron.neuronId === b.neuronId);
      return !!n;
    }) ?? [];

  // @TODO: We have to refine this logic. What if a user votes differently in the nns-dapp and then not all neurons end up voting the same?
  const myVotes = myVotingBallots.filter((b) => b.vote !== Vote.Unspecified);
  const hasVoted = myVotingBallots.length > 0 && myVotes.length === myVotingBallots.length;
  const isVoteMixed = hasVoted && !myVotes.every((v) => v.vote === myVotes[0].vote);
  const voteValue = hasVoted && !isVoteMixed ? myVotes[0].vote : Vote.Unspecified;

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  return (
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
              {formatPercent(yesProportion * 100)}
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
              {formatPercent(noProportion * 100)}
            </span>
          </div>
        </div>
      </CardHeader>

      {(canUserVote || hasVoted) && (
        <CardFooter className="pt-2 pb-4">
          {hasVoted ? (
            <div className="flex w-full items-center gap-2 rounded-md border border-green-200 bg-green-100 p-3 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">
                {isVoteMixed ? (
                  [<TriangleAlert />, t(($) => $.proposal.voteStatusMixed)]
                ) : voteValue === Vote.Yes ? (
                  <ThumbsUp />
                ) : (
                  <ThumbsDown />
                )}
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
  );
}
