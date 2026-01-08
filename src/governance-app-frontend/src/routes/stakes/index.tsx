import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyNeuronsState } from '@features/stakes/components/EmptyNeuronsState';
import { NeuronsList } from '@features/stakes/components/NeuronsList';
import { StakeNeuronModal } from '@features/stakes/components/StakeNeuronModal';

import { QueryStates } from '@components/QueryStates';
import { useGovernanceNeurons } from '@hooks/governance';
import { CertifiedData } from '@typings/queries';
import { cn } from '@utils/shadcn';

export const Route = createFileRoute('/stakes/')({
  component: StakesComponent,
  staticData: {
    title: 'common.stakes',
  },
});

function StakesComponent() {
  const { t } = useTranslation();
  const neuronsQuery = useGovernanceNeurons();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(($) => $.neuron.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.neuron.description)}</p>
        </div>
        <div
          className={cn(
            'flex-1 sm:flex-initial',
            neuronsQuery?.data?.response.length === 0 ? 'hidden sm:block' : '',
          )}
        >
          <StakeNeuronModal />
        </div>
      </div>

      <QueryStates<CertifiedData<NeuronInfo[]>>
        query={neuronsQuery}
        isEmpty={(neurons) => neurons.response.length === 0}
        emptyComponent={<EmptyNeuronsState />}
      >
        {(neurons) => <NeuronsList neurons={neurons.response} />}
      </QueryStates>
    </div>
  );
}
