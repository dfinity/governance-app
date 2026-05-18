import { Network, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyActionState } from '@components/EmptyActionState';

type Props = {
  openStakingWizard: () => void;
};

export const EmptyNeuronsState = ({ openStakingWizard }: Props) => {
  const { t } = useTranslation();

  return (
    <EmptyActionState
      icon={Network}
      title={t(($) => $.neuron.empty.title)}
      description={t(($) => $.neuron.empty.description)}
      ctaLabel={t(($) => $.neuron.empty.cta)}
      ctaIcon={Plus}
      onCtaClick={openStakingWizard}
      ctaTestId="empty-neurons-state-open-staking-wizard-btn"
      helper={t(($) => $.neuron.empty.helper)}
    />
  );
};
