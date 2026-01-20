import type { KnownNeuron } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { ArrowRight, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { KNOWN_NEURONS_SORTING_MAP } from '@features/voting/data/knownNeuronsSorting';
import { isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';
import { formatVotingPower } from '@features/voting/utils/formatVotingPower';

import { Badge } from '@components/badge';
import { Card, CardContent } from '@components/Card';
import { DASHBOARD_URL } from '@constants/extra';

type Props = {
  neuron: KnownNeuron | bigint;
};

export const FollowedNeuronCard = ({ neuron }: Props) => {
  const { t } = useTranslation();
  const isKnown = isKnownNeuron(neuron);

  const neuronId = isKnown ? neuron.id : neuron;
  const neuronDetailsUrl = `${DASHBOARD_URL}/${neuronId}`;

  const renderContent = () => {
    if (isKnown) {
      const committedTopics = (neuron.committed_topics ?? []).flatMap((topic) =>
        Object.keys(topic[0] ?? {}),
      );

      const votingPower = KNOWN_NEURONS_SORTING_MAP[String(neuron.id)]?.voting_power;

      return (
        <div className="flex min-w-0 flex-col gap-1">
          <h4 className="truncate text-base font-semibold">{neuron.name}</h4>
          {nonNullish(votingPower) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="size-3" />
              <span className="text-xs">
                {t(($) => $.voting.votingPower, { ammount: formatVotingPower(votingPower) })}
              </span>
            </div>
          )}
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
        <h4 className="truncate text-base font-semibold">
          {t(($) => $.neuron.neuronId, { neuronId: neuron.toString() })}
        </h4>
      </div>
    );
  };

  return (
    <Card className="p-0">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        {renderContent()}

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-sm border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center text-xs font-semibold tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            {t(($) => $.voting.following)}
          </span>
          <a
            href={neuronDetailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex shrink-0 items-center gap-1 rounded-sm bg-blue-500/[.08] px-2.5 py-1.5 text-xs hover:bg-blue-500/[.20] dark:bg-blue-400/10 hover:dark:bg-blue-400/30"
          >
            {t(($) => $.common.seeDetails)}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
