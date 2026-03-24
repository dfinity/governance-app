import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  getConfiguredTopicCount,
  getFollowableTopicFolloweesMap,
  TOTAL_TOPIC_COUNT,
} from '@features/voting/utils/topicFollowing';

import { Card, CardContent } from '@components/Card';

type AutomaticVotingCardProps = {
  neurons: NeuronInfo[];
};

enum CoverageState {
  None = 'none',
  Partial = 'partial',
  Full = 'full',
}

const getCoverageState = (neurons: NeuronInfo[]): CoverageState => {
  if (neurons.length === 0) return CoverageState.None;

  let allFull = true;
  let allNone = true;

  for (const neuron of neurons) {
    const map = getFollowableTopicFolloweesMap(neuron);
    const count = getConfiguredTopicCount(map);
    if (count < TOTAL_TOPIC_COUNT) allFull = false;
    if (count > 0) allNone = false;
  }

  if (allNone) return CoverageState.None;
  if (allFull) return CoverageState.Full;
  return CoverageState.Partial;
};

export function AutomaticVotingCard({ neurons }: AutomaticVotingCardProps) {
  const { t } = useTranslation();
  const coverage = getCoverageState(neurons);

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-automatic-voting-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.automaticVoting.label)}
        </p>
        <div className="flex items-center gap-2">
          {coverage === CoverageState.Full ? (
            <>
              <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg font-semibold text-foreground md:text-2xl">
                {t(($) => $.neuron.summary.automaticVoting.knownNeuronSelected)}
              </span>
            </>
          ) : coverage === CoverageState.Partial ? (
            <>
              <CircleDashed className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-lg font-semibold text-foreground md:text-2xl">
                {t(($) => $.neuron.summary.automaticVoting.partial)}
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
        {coverage !== CoverageState.Full && (
          <Link
            to="/voting"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t(($) => $.neuron.summary.automaticVoting.setupVoting)}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
