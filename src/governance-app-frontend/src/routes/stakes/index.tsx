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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(($) => $.neuron.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.neuron.description)}</p>
        </div>
        <StakeNeuronModal />
      </div>
      <NeuronsList />
    </div>
  );
}
