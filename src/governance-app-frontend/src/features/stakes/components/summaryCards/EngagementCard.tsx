import { Link } from '@tanstack/react-router';
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
    engagement !== null
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
            <Link to="/voting" search={{ showProposals: true, proposalFilter: ProposalFilter.All }}>
              Temp Link with example
            </Link>
            <p className="text-lg font-semibold text-foreground md:text-2xl">
              {formattedRate !== null ? `${formattedRate}%` : '—'}
            </p>
            {engagement !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                {engagement.participated}/{engagement.total} votes
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
