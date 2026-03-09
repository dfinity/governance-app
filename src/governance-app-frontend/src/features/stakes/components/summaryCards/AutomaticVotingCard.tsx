import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getUsersFollowedNeurons } from '@features/voting/utils/findFollowedNeuron';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';

export function AutomaticVotingCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const followedNeurons = getUsersFollowedNeurons({
    userNeurons,
    knownNeurons,
  });

  // TODO: Treats inconsistent followees (neurons following different known neurons) as "Not set up".
  // Consider adding a third state if users report confusion.
  const hasKnownNeuron = followedNeurons.length === 1 && followedNeurons[0] !== undefined;

  const isLoading = neuronsQuery.isLoading || knownNeuronsQuery.isLoading;
  const isError = neuronsQuery.isError || knownNeuronsQuery.isError;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-automatic-voting-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.automaticVoting.label)}
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : isError ? (
          <p className="text-lg font-semibold text-foreground md:text-2xl">—</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {hasKnownNeuron ? (
                <>
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-lg font-semibold text-foreground md:text-2xl">
                    {t(($) => $.neuron.summary.automaticVoting.knownNeuronSelected)}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-lg font-semibold text-foreground md:text-2xl">
                    {t(($) => $.neuron.summary.automaticVoting.notSetUp)}
                  </span>
                </>
              )}
            </div>
            {!hasKnownNeuron && (
              <Link
                to="/voting"
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(($) => $.neuron.summary.automaticVoting.setupVoting)}
                <ChevronRight className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
