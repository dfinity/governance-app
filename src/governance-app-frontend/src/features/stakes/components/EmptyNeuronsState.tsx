import { Network, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

type Props = {
  openStakingWizard: () => void;
};

export const EmptyNeuronsState = ({ openStakingWizard }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
        <Network className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-semibold">{t(($) => $.neuron.empty.title)}</h3>
      <p className="max-w-sm text-base text-muted-foreground">
        {t(($) => $.neuron.empty.description)}
      </p>
      <Button
        data-testid="empty-neurons-state-open-staking-wizard-btn"
        className="w-full sm:w-auto"
        onClick={openStakingWizard}
        size="xl"
      >
        <Plus />
        {t(($) => $.neuron.empty.cta)}
      </Button>
      <p className="max-w-md text-sm text-muted-foreground">{t(($) => $.neuron.empty.helper)}</p>
    </div>
  );
};
