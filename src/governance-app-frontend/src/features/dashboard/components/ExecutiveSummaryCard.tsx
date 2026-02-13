import { Link } from '@tanstack/react-router';
import { Check, CircleDot, Clock, Share2, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardAction, CardContent, CardHeader } from '@components/Card';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { cn } from '@utils/shadcn';

import { currentSummary } from '../constants/executiveSummaryData';
import type {
  CommunityVoteHighlight,
  CommunityVoteOutcome,
  OutcomeStatus,
  TopChange,
  TopChangeIcon,
} from '../types/executiveSummary';

const outcomeColorMap: Record<OutcomeStatus, string> = {
  approved: 'bg-emerald-800 dark:bg-emerald-400',
  rejected: 'bg-orange-600 dark:bg-orange-400',
  failed: 'bg-gray-400 dark:bg-gray-500',
};

const topChangeIconMap: Record<TopChangeIcon, ComponentType<{ className?: string }>> = {
  network: Share2,
  protocol: CircleDot,
  community: Clock,
};

const voteOutcomeConfig: Record<
  CommunityVoteOutcome,
  { icon: ComponentType<{ className?: string }>; bgClassName: string; iconClassName: string }
> = {
  passed: {
    icon: Check,
    bgClassName: 'bg-green-100 dark:bg-green-500/10',
    iconClassName: 'text-green-500 dark:text-green-400',
  },
  rejected: {
    icon: X,
    bgClassName: 'bg-red-100 dark:bg-red-500/10',
    iconClassName: 'text-red-500 dark:text-red-400',
  },
};

function OutcomePill({
  status,
  label,
  count,
}: {
  status: OutcomeStatus;
  label: string;
  count: number;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-foreground dark:bg-neutral-800">
      <span className={`inline-block size-1 rounded-full ${outcomeColorMap[status]}`} />
      <span>{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </span>
  );
}

function TopChangeItem({ change }: { change: TopChange }) {
  const Icon = topChangeIconMap[change.icon];

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{change.title}</p>
        <p className="text-sm text-muted-foreground">{change.description}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {change.highlights.map((h) => (
            <span key={h.label} className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{h.value}</span> {h.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommunityVoteItem({ vote }: { vote: CommunityVoteHighlight }) {
  const { icon: Icon, bgClassName, iconClassName } = voteOutcomeConfig[vote.outcome];

  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${bgClassName}`}
      >
        <Icon className={cn('size-3', iconClassName)} />
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-medium text-foreground">{vote.title}</p>
        <p className="text-xs text-muted-foreground">{vote.label}</p>
      </div>
    </div>
  );
}

export const ExecutiveSummaryCard = () => {
  const { t } = useTranslation();
  const { month, year, outcomes, topChanges, communityHighlights } = currentSummary;

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1_000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(($) => $.home.executiveSummary.title)}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h2 className="text-2xl font-semibold text-foreground">
              {month} {year}
            </h2>
          )}
        </div>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link to="/voting" preload="intent">
              {t(($) => $.home.executiveSummary.goToVoting)}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-2 px-6">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-28 rounded-full" />
            ))
          : outcomes.map((o) => (
              <OutcomePill
                key={o.status}
                status={o.status}
                label={t(($) => $.home.executiveSummary.outcomes[o.status])}
                count={o.count}
              />
            ))}
      </div>

      <CardContent className="flex flex-col gap-6">
        <Separator />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-5">
              <Skeleton className="h-3 w-48" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="size-5 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t(($) => $.home.executiveSummary.topChanges)}
              </h3>
              <div className="flex flex-col gap-5">
                {topChanges.map((change) => (
                  <TopChangeItem key={change.title} change={change} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t(($) => $.home.executiveSummary.communityVotes)}
              </h3>
              <div className="flex flex-col gap-4">
                {communityHighlights.map((vote) => (
                  <CommunityVoteItem key={vote.title} vote={vote} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
