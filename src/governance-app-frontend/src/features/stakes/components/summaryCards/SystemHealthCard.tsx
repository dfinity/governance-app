import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getUsersFollowedNeurons } from '@features/voting/utils/findFollowedNeuron';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';

export function SystemHealthCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const followedNeurons = getUsersFollowedNeurons({
    userNeurons,
    knownNeurons,
  });

  const hasRepresentative = followedNeurons.length === 1 && followedNeurons[0] !== undefined;  

  const isLoading = neuronsQuery.isLoading || knownNeuronsQuery.isLoading;
  const isError = neuronsQuery.isError || knownNeuronsQuery.isError;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-system-health-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.systemHealth.label)}
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : isError ? (
          <p className="text-lg font-semibold text-foreground md:text-2xl">—</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {hasRepresentative ? (
                <>
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-lg font-semibold text-foreground md:text-2xl">
                    {t(($) => $.neuron.summary.systemHealth.representativeSelected)}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-lg font-semibold text-foreground md:text-2xl">
                    {t(($) => $.neuron.summary.systemHealth.notSetUp)}
                  </span>
                </>
              )}
            </div>
            {!hasRepresentative && (
              <Link
                to="/voting"
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(($) => $.neuron.summary.systemHealth.setupVoting)}
                <ChevronRight className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
