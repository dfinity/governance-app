import { Network, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

import { StakeNeuronModal } from './StakeNeuronModal';

export const EmptyNeuronsState = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
        <Network className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-semibold capitalize">{t(($) => $.neuron.empty.title)}</h3>
      <p className="max-w-sm text-base text-muted-foreground">
        {t(($) => $.neuron.empty.description)}
      </p>
      <StakeNeuronModal
        trigger={
          <Button size="xl" className="w-full capitalize xs:w-auto">
            <Plus className="mr-2 size-5" />
            {t(($) => $.neuron.empty.cta)}
          </Button>
        }
      />
    </div>
  );
};
