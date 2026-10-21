import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ProposalFilter } from '@features/proposals/utils';
import { useNeuronEngagement } from '@features/stakes/hooks/useNeuronEngagement';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import {
  CARD_ACTION_CHEVRON_CLASS,
  CARD_ACTION_CLASS,
  CLICKABLE_CARD_CLASS,
  CLICKABLE_CARD_HOVER_CLASS,
} from './clickableCard';

type EngagementCardProps = {
  neurons: NeuronInfo[];
};

const PROPOSALS_SEARCH = { showProposals: true, proposalFilter: ProposalFilter.All };

const PROPOSALS_LINK: LinkProps = { to: '/voting', search: PROPOSALS_SEARCH };

/**
 * Shows how many ballots of the user's neurons have a vote, on the decided
 * proposals that still accept votes. A strip on the bottom edge has one
 * segment for each proposal, from the oldest on the left to the newest on the
 * right. The whole card opens the proposals.
 */
export function EngagementCard({ neurons }: EngagementCardProps) {
  const { t } = useTranslation();
  const { engagement, isLoading } = useNeuronEngagement(neurons);

  // Round down, so that a missing vote never shows as 100%.
  const formattedRate = nonNullish(engagement)
    ? formatNumber(Math.floor(engagement.rate * 1000) / 10, { minFraction: 0, maxFraction: 1 })
    : null;

  const toVote = engagement?.proposals.filter(({ voted }) => !voted) ?? [];

  const action: { label: string; link: LinkProps } =
    engagement === null
      ? { label: t(($) => $.neuron.summary.engagementAction), link: PROPOSALS_LINK }
      : toVote.length === 0
        ? { label: t(($) => $.neuron.summary.engagementActionComplete), link: PROPOSALS_LINK }
        : {
            label: t(($) => $.neuron.summary.engagementActionToVote, { count: toVote.length }),
            link:
              toVote.length === 1
                ? {
                    to: '/voting/proposals/$id',
                    params: { id: toVote[0].proposalId },
                    search: PROPOSALS_SEARCH,
                  }
                : PROPOSALS_LINK,
          };

  return (
    <Card
      className={cn(
        'gap-3 overflow-hidden py-4',
        !isLoading && [CLICKABLE_CARD_CLASS, CLICKABLE_CARD_HOVER_CLASS],
      )}
      data-testid="stakes-summary-engagement-card"
    >
      <CardContent>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative z-10 mb-2 block w-fit cursor-default text-left text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t(($) => $.neuron.summary.engagement)}{' '}
              <span className="sr-only">{t(($) => $.neuron.summary.engagementTooltip)}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{t(($) => $.neuron.summary.engagementTooltip)}</TooltipContent>
        </Tooltip>
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-32 md:h-8" />
            <Skeleton className="mt-1 h-5 w-20" />
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-foreground md:text-2xl">
              {formattedRate !== null ? `${formattedRate}%` : '—'}
            </p>
            <Link
              {...action.link}
              className={cn(CARD_ACTION_CLASS, 'mt-1 block w-fit text-muted-foreground')}
              data-card-action
              data-testid="engagement-card-action"
            >
              {action.label}
              &nbsp;
              <ChevronRight className={CARD_ACTION_CHEVRON_CLASS} />
            </Link>
          </>
        )}
      </CardContent>

      {!isLoading && nonNullish(engagement) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-0.75 gap-px bg-border"
          data-testid="engagement-card-strip"
        >
          {engagement.proposals.map(({ proposalId, voted }) => (
            <span
              key={proposalId.toString()}
              className={cn('flex-1', voted ? 'bg-emerald-500' : 'bg-amber-500')}
              data-voted={voted}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
