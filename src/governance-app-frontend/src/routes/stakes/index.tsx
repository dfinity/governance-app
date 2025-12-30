import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { NeuronsList } from '@features/stakes/components/NeuronsList';
import { StakeNeuronModal } from '@features/stakes/components/StakeNeuronModal';

export const Route = createFileRoute('/stakes/')({
  component: StakesComponent,
  staticData: {
    title: 'common.stakes',
  },
});

function StakesComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between">
        <div>
          <h2 className="mb-2 text-lg font-semibold">{t(($) => $.neuron.title)}</h2>
          <p className="text-sm">{t(($) => $.neuron.description)}</p>
        </div>
        <StakeNeuronModal />
      </div>
      <NeuronsList />
    </div>
  );
}
