import { Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { StakingWizardModal } from './stakingWizard';

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
      <StakingWizardModal triggerText={t(($) => $.neuron.empty.cta)} />
    </div>
  );
};
