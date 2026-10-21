import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
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

export function EngagementCard({ neurons }: EngagementCardProps) {
  const { t } = useTranslation();
  const { engagement, isLoading } = useNeuronEngagement(neurons);

  const formattedRate = nonNullish(engagement)
    ? formatNumber(engagement.rate * 100, { minFraction: 1, maxFraction: 1 })
    : null;

  return (
    <Card
      className={cn(
        'gap-3 py-4 wrap-anywhere',
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
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground md:text-2xl">
                {formattedRate !== null ? `${formattedRate}%` : '—'}
              </span>
              {engagement !== null && (
                <span className="text-sm text-muted-foreground">
                  {engagement.participated}/{engagement.total}
                </span>
              )}
            </div>
            <Link
              to="/voting"
              search={{ showProposals: true, proposalFilter: ProposalFilter.All }}
              className={cn(CARD_ACTION_CLASS, 'mt-1 block w-fit text-muted-foreground')}
              data-card-action
            >
              {t(($) =>
                engagement?.rate === 1
                  ? $.neuron.summary.engagementActionComplete
                  : $.neuron.summary.engagementAction,
              )}
              &nbsp;
              <ChevronRight className={CARD_ACTION_CHEVRON_CLASS} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
