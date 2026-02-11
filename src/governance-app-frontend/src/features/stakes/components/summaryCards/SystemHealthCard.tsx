import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getUsersFollowedNeurons } from '@features/voting/utils/findFollowedNeuron';

import { Button } from '@components/button';
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
          <p className="text-2xl font-semibold text-foreground">—</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              {hasRepresentative ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            {hasRepresentative ? (
              <p className="text-[15px] font-semibold text-foreground">
                {t(($) => $.neuron.summary.systemHealth.representativeSelected)}
              </p>
            ) : (
              <Button size="sm" variant="outline" className="w-fit" asChild>
                <Link to="/voting">
                  <Users className="size-4" />
                  {t(($) => $.neuron.summary.systemHealth.setupVoting)}
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
