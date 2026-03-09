import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ProposalFilter } from '@features/proposals/utils';
import { useNeuronEngagement } from '@features/stakes/hooks/useNeuronEngagement';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { formatNumber } from '@utils/numbers';

export function EngagementCard() {
  const { t } = useTranslation();
  const { engagement, isLoading } = useNeuronEngagement();

  const formattedRate =
    nonNullish(engagement)
      ? formatNumber(engagement.rate * 100, { minFraction: 1, maxFraction: 1 })
      : null;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-engagement-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.engagement)}
        </p>
        {isLoading ? (
          <>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-20" />
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
              className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(($) =>
                engagement?.rate === 1
                  ? $.neuron.summary.engagementActionComplete
                  : $.neuron.summary.engagementAction,
              )}
              <ChevronRight className="size-3.5" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
