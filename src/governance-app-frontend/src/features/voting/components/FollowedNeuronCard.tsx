import type { KnownNeuron } from '@icp-sdk/canisters/nns';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { DASHBOARD_URL } from '@constants/extra';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';

type Props = {
  neuron: KnownNeuron | bigint;
};

export const FollowedNeuronCard = ({ neuron }: Props) => {
  const { t } = useTranslation();
  const isKnown = isKnownNeuron(neuron);
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const neuronId = isKnown ? neuron.id : neuron;
  const neuronDetailsUrl = `${DASHBOARD_URL}/${neuronId}`;

  const renderContent = () => {
    if (isKnown) {
      const committedTopics = (neuron.committed_topics ?? []).flatMap((topic) =>
        Object.keys(topic[0] ?? {}),
      );

      return (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <h4 className="truncate text-base font-semibold">{neuron.name}</h4>
            <span className="rounded-sm border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              {t(($) => $.voting.following)}
            </span>
          </div>
          {/* @TODO: DO we want to keep this? */}
          {committedTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {committedTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="px-2 py-0.5 text-xs font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h4 className="truncate text-base font-semibold">
            {t(($) => $.neuron.neuronId, { neuronId: neuron.toString() })}
          </h4>
          <span className="rounded-sm border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            {t(($) => $.voting.following)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-0">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-md bg-muted p-2">
            <CheckCircle2 className="size-5 text-muted-foreground" />
          </div>
          {knownNeuronsQuery.isLoading ? <Skeleton className="h-6 w-40" /> : renderContent()}
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={neuronDetailsUrl} target="_blank" rel="noopener noreferrer">
            {t(($) => $.voting.viewRepresentative)}
            <ExternalLink className="size-3" />
            <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
