import { secondsToDuration } from '@dfinity/utils';
import { ProposalInfo, Topic, Vote } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCircle, Clock, Tag, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { VOTING_RESULTS_PRECISION } from '@constants/extra';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { bigIntDiv } from '@utils/bigInt';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';
import { setWithItemAdded, setWithItemRemoved } from '@utils/set';

type Props = {
  proposal: ProposalInfo;
  canUserVote: boolean;
  certified?: boolean;
};

export function ProposalListItem({ proposal, canUserVote, certified }: Props) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Voting Hook Logic (Simplified from ProposalDetailsVoting)
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
    yes !== undefined && total !== undefined && total > 0n
      ? bigIntDiv(yes, total, VOTING_RESULTS_PRECISION).toFixed(0)
      : '0';
  console.log(yes, total, bigIntDiv(yes, total, VOTING_RESULTS_PRECISION));

  // Time left
  const now = Date.now() / 1000;
  const deadline = Number(proposal.deadlineTimestampSeconds ?? 0n);
  const timeLeftSeconds = BigInt(Math.floor(Math.max(deadline - now, 0)));
  const timeLeft = secondsToDuration({
    seconds: timeLeftSeconds,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  // Vote Action
  const { ready, canister, authenticated } = useNnsGovernance();
  const [pending, setPending] = useState(new Set<bigint>());
  const canTriggerVote = ready && authenticated && canUserVote && !hasVoted;

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

  const castVote = (e: React.MouseEvent, vote: Vote) => {
    e.stopPropagation();
    // Vote with ALL eligible neurons for simplicity in list view
    // The ProposalDetailsVoting lets you vote per neuron.
    // Here we just grab all my voting neurons that haven't voted yet?
    // Actually, if canUserVote is true, it means at least one neuron can vote.
    // We should probably filter to only those that haven't voted.
    const neuronsToVote = myVotingNeurons.filter((b) => b.vote === Vote.Unspecified);

    neuronsToVote.forEach((n) => {
      voteMutation.mutate({ proposalId: proposal.id!, vote, neuronId: n.neuronId });
    });
  };

  const isPending = pending.size > 0;

  const handleCardClick = () => {
    navigate({ to: '/voting/proposals/$id', params: { id: proposal.id! } });
  };

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:bg-accent/50"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Proposal #{proposal.id?.toString()}
          </span>
          <CertifiedBadge certified={certified} />
        </div>

        <h3 className="mb-2 text-lg leading-tight font-bold decoration-primary underline-offset-4">
          {proposal.proposal?.title}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <Clock className="h-3.5 w-3.5" />
            {timeLeft} left
          </Badge>
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

      <CardContent className="pb-0" />

      {(canUserVote || hasVoted) && (
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
                onClick={(e) => castVote(e, Vote.Yes)}
                variant="default"
                size="sm"
                disabled={!canTriggerVote || isPending}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                {isPending ? (
                  'Voting...'
                ) : (
                  <>
                    <ThumbsUp className="mr-2 h-4 w-4" /> Adopt
                  </>
                )}
              </Button>
              <Button
                onClick={(e) => castVote(e, Vote.No)}
                variant="destructive"
                size="sm"
                disabled={!canTriggerVote || isPending}
                className="flex-1"
              >
                {isPending ? (
                  'Voting...'
                ) : (
                  <>
                    <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                  </>
                )}
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
