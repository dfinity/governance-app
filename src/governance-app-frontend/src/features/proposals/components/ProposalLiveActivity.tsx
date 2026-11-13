import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@components/Card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { secondsToTime } from '@utils/date';
import { formatCompactNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { isTakingVotes, SeenVote, useKnownNeuronVotes } from '../hooks/useProposalLiveData';
import { useProposalTallyHistory } from '../hooks/useProposalTallyHistory';
import {
  getTallyChanges,
  KnownNeuronVote,
  KnownNeuronVoteState,
  TallyChange,
} from '../knownNeuronVotes';

type Props = {
  proposal: ProposalInfo;
  // The page keeps these, so a layout change at a breakpoint does not reset them.
  knownNeuronVotes: ReturnType<typeof useKnownNeuronVotes>;
  seenVotes: SeenVote[];
};

// A vote seen this recently shows as "Just now" and keeps its highlight.
const JUST_NOW_MS = 60_000;
const VISIBLE_EVENTS = 5;

const YES_TEXT = 'text-emerald-800 dark:text-emerald-400';
const NO_TEXT = 'text-red-800 dark:text-red-400';
const YES_FILL = 'bg-emerald-800 dark:bg-emerald-400';
const NO_FILL = 'bg-red-800 dark:bg-red-400';

type TimelineEvent =
  | { kind: 'vote'; timeMs: number; vote: KnownNeuronVote }
  | { kind: 'tally'; timeMs: number; change: TallyChange; ordinal: number };

// We only support English for now.
const formatEventTime = (timeMs: number, nowMs: number) => {
  const seconds = timeMs / MILLISECONDS_IN_SECOND;
  if (new Date(timeMs).toDateString() === new Date(nowMs).toDateString()) {
    return secondsToTime(seconds);
  }
  const day = new Date(timeMs).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return `${day}, ${secondsToTime(seconds)}`;
};

/** Re-renders every `intervalMs` while `enabled`, so relative labels such as "Just now" expire. */
const useNow = (intervalMs: number, enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
};

const VoteLabel = ({ state }: { state: KnownNeuronVoteState }) => {
  const { t } = useTranslation();
  if (state === KnownNeuronVoteState.Yes)
    return <span className={YES_TEXT}>{t(($) => $.proposal.yes)}</span>;
  if (state === KnownNeuronVoteState.No)
    return <span className={NO_TEXT}>{t(($) => $.proposal.no)}</span>;
  return null;
};

const useVoteLabel = () => {
  const { t } = useTranslation();
  return ({ name, state }: KnownNeuronVote) => {
    switch (state) {
      case KnownNeuronVoteState.Yes:
        return t(($) => $.proposal.liveActivity.votedYes, { name });
      case KnownNeuronVoteState.No:
        return t(($) => $.proposal.liveActivity.votedNo, { name });
      case KnownNeuronVoteState.NotVoted:
        return t(($) => $.proposal.liveActivity.notVoted, { name });
      case KnownNeuronVoteState.Unknown:
        return t(($) => $.proposal.liveActivity.unknownVote, { name });
    }
  };
};

const NeuronSquare = ({ vote, isNew }: { vote: KnownNeuronVote; isNew: boolean }) => {
  const label = useVoteLabel()(vote);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-hidden
          className={cn(
            'aspect-square rounded-[2px] border',
            vote.state === KnownNeuronVoteState.Yes && cn(YES_FILL, 'border-transparent'),
            vote.state === KnownNeuronVoteState.No && cn(NO_FILL, 'border-transparent'),
            vote.state === KnownNeuronVoteState.NotVoted && 'border-border',
            vote.state === KnownNeuronVoteState.Unknown && 'border-dashed border-border',
            isNew && 'outline-2 outline-offset-1 outline-primary',
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};

const TimelineDot = ({ highlighted, className }: { highlighted: boolean; className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'absolute top-1 -left-4 size-2.5 rounded-full border',
      highlighted ? 'border-primary bg-primary' : 'border-muted-foreground bg-card',
      className,
    )}
  />
);

const TallyChangeRow = ({
  change,
  maxChange,
  time,
}: {
  change: TallyChange;
  maxChange: number;
  time: string;
}) => {
  const { t } = useTranslation();
  return (
    <li className="relative">
      <TimelineDot highlighted={false} />
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{time}</span>
        <span className="text-right">
          {change.yes > 0 && (
            <span className={YES_TEXT}>
              {t(($) => $.proposal.liveActivity.yesAdded, {
                amount: formatCompactNumber(change.yes),
              })}
            </span>
          )}
          {change.yes > 0 && change.no > 0 && <span className="text-muted-foreground"> · </span>}
          {change.no > 0 && (
            <span className={NO_TEXT}>
              {t(($) => $.proposal.liveActivity.noAdded, {
                amount: formatCompactNumber(change.no),
              })}
            </span>
          )}
        </span>
      </div>
      <div aria-hidden className="mt-1.5 flex h-1.5 gap-0.5">
        {change.yes > 0 && (
          <span
            className={cn('rounded-[2px]', YES_FILL)}
            style={{ width: `${(change.yes / maxChange) * 100}%` }}
          />
        )}
        {change.no > 0 && (
          <span
            className={cn('rounded-[2px]', NO_FILL)}
            style={{ width: `${(change.no / maxChange) * 100}%` }}
          />
        )}
      </div>
    </li>
  );
};

export const ProposalLiveActivity = ({ proposal, knownNeuronVotes, seenVotes }: Props) => {
  const { t } = useTranslation();
  const live = isTakingVotes(proposal);
  const { votes, dataUpdatedAt } = knownNeuronVotes;
  const historyQuery = useProposalTallyHistory(proposal);
  const voteLabel = useVoteLabel();
  // Runs also after the close, so a highlight that started just before it still ends.
  const nowMs = useNow(15_000, seenVotes.length > 0);
  const [expanded, setExpanded] = useState(false);

  // A failed poll keeps the last votes on screen.
  if (!votes) return null;
  if (votes.every(({ state }) => state === KnownNeuronVoteState.Unknown)) return null;

  const count = (state: KnownNeuronVoteState) => votes.filter((v) => v.state === state).length;
  const yesCount = count(KnownNeuronVoteState.Yes);
  const noCount = count(KnownNeuronVoteState.No);
  const notVotedCount = count(KnownNeuronVoteState.NotVoted);
  const unknownCount = count(KnownNeuronVoteState.Unknown);

  const isJustNow = (seenAtMs: number) => nowMs - seenAtMs < JUST_NOW_MS;
  const newIds = new Set(
    seenVotes.filter(({ seenAtMs }) => isJustNow(seenAtMs)).map(({ vote }) => vote.id),
  );

  const changes = historyQuery.data
    ? getTallyChanges({ history: historyQuery.data, proposal })
    : [];
  const events: TimelineEvent[] = [
    ...seenVotes.map(({ vote, seenAtMs }) => ({ kind: 'vote' as const, timeMs: seenAtMs, vote })),
    ...changes.map((change, index) => ({
      kind: 'tally' as const,
      timeMs: change.timestampSeconds * MILLISECONDS_IN_SECOND,
      change,
      // Changes come newest first, so counting from the oldest keeps each key stable.
      ordinal: changes.length - index,
    })),
  ].toSorted((a, b) => b.timeMs - a.timeMs);
  const shownEvents = expanded ? events : events.slice(0, VISIBLE_EVENTS);
  // The first reading often holds most of the votes, so the bars compare the rows on screen.
  const maxChange = Math.max(
    ...shownEvents.map((event) =>
      event.kind === 'tally' ? event.change.yes + event.change.no : 0,
    ),
    1,
  );
  const hiddenCount = events.length - VISIBLE_EVENTS;

  return (
    <Card data-testid="proposal-live-activity">
      <CardHeader>
        <CardTitle>
          {live
            ? t(($) => $.proposal.liveActivity.title)
            : t(($) => $.proposal.liveActivity.closedTitle)}
        </CardTitle>
        {live && dataUpdatedAt > 0 && (
          <CardAction className="flex items-center gap-1.5 self-center text-xs text-muted-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-emerald-800 motion-safe:animate-pulse dark:bg-emerald-400"
            />
            {t(($) => $.proposal.liveActivity.updatedAt, {
              time: secondsToTime(dataUpdatedAt / MILLISECONDS_IN_SECOND),
            })}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
            <span>{t(($) => $.proposal.liveActivity.knownNeurons)}</span>
            <span>
              <span className={YES_TEXT}>
                {t(($) => $.proposal.liveActivity.yesCount, { count: yesCount })}
              </span>
              {' · '}
              <span className={NO_TEXT}>
                {t(($) => $.proposal.liveActivity.noCount, { count: noCount })}
              </span>
              {' · '}
              {live
                ? t(($) => $.proposal.liveActivity.notYetCount, { count: notVotedCount })
                : t(($) => $.proposal.liveActivity.didNotVoteCount, { count: notVotedCount })}
              {unknownCount > 0 && (
                <>
                  {' · '}
                  {t(($) => $.proposal.liveActivity.unknownCount, { count: unknownCount })}
                </>
              )}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[3px]">
            {votes.map((vote) => (
              <NeuronSquare key={String(vote.id)} vote={vote} isNew={newIds.has(vote.id)} />
            ))}
          </div>
          <ul className="sr-only">
            {votes.map((vote) => (
              <li key={String(vote.id)}>{voteLabel(vote)}</li>
            ))}
          </ul>
        </div>

        {live && events.length > 0 && (
          <div className="flex flex-col gap-3">
            <ol className="relative flex flex-col gap-3 pl-4" aria-live="polite">
              <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
              {shownEvents.map((event) =>
                event.kind === 'vote' ? (
                  <li
                    key={`vote-${event.vote.id}`}
                    className={cn(
                      'relative rounded-md text-xs',
                      isJustNow(event.timeMs) && '-mx-2 -my-1 bg-primary/10 px-2 py-1',
                    )}
                  >
                    {/* The highlighted row moves 0.5rem left, so its dot moves back by the same amount. */}
                    <TimelineDot
                      highlighted
                      className={cn(isJustNow(event.timeMs) && 'top-2 -left-2')}
                    />
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span>
                        {isJustNow(event.timeMs)
                          ? t(($) => $.proposal.liveActivity.justNow)
                          : formatEventTime(event.timeMs, nowMs)}
                      </span>
                      {isJustNow(event.timeMs) && (
                        <span className="text-primary">
                          {t(($) => $.proposal.liveActivity.new)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{event.vote.name}</span>{' '}
                      {t(($) => $.proposal.liveActivity.voted)}{' '}
                      <VoteLabel state={event.vote.state} />
                    </div>
                  </li>
                ) : (
                  <TallyChangeRow
                    key={`tally-${event.ordinal}`}
                    change={event.change}
                    maxChange={maxChange}
                    time={formatEventTime(event.timeMs, nowMs)}
                  />
                ),
              )}
            </ol>
            {hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-fit px-0 text-xs font-normal text-foreground-secondary hover:bg-transparent"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded
                  ? t(($) => $.proposal.liveActivity.showFewer)
                  : t(($) => $.proposal.liveActivity.showEarlier, { count: hiddenCount })}
                <ChevronDown
                  className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
                />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
