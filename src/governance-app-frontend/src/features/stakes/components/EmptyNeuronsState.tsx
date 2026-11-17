import { Network, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AccountMetadata } from '@features/accounts/types';

import { EmptyActionState } from '@components/EmptyActionState';

import { LedgerDevicesMenu } from './LedgerDevicesMenu';

type Props = {
  openStakingWizard: () => void;
  onSelectLedgerDevice: (device: AccountMetadata) => void;
};

export const EmptyNeuronsState = ({ openStakingWizard, onSelectLedgerDevice }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center">
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
      <LedgerDevicesMenu variant="link" onSelectDevice={onSelectLedgerDevice} />
    </div>
  );
};
