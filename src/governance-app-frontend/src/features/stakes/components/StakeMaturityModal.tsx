import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Info } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useStakeMaturity } from '../hooks/useStakeMaturity';

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StakeMaturityModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useStakeMaturity();

  const unstakedMaturity = neuron ? bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn) : 0;

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.neuronDetailModal.stakeMaturity.confirming)}
      successMessage={t(($) => $.neuronDetailModal.stakeMaturity.success)}
      navBlockerDescription={t(($) => $.neuronDetailModal.confirmNavigation)}
      data-testid="stake-maturity-modal"
    >
      {({ execute, close }) => (
        <>
          <MutationDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.neuronDetailModal.stakeMaturity.title)}
            </ResponsiveDialogTitle>
          </MutationDialogHeader>

          <MutationDialogBody className="mt-4 flex flex-col gap-4 px-4 md:px-0">
            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <Trans
                  i18nKey={($) => $.neuronDetailModal.stakeMaturity.info}
                  t={t}
                  values={{ amount: formatNumber(unstakedMaturity) }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>
          </MutationDialogBody>

          <MutationDialogFooter>
            <Button
              variant="outline"
              size="xl"
              className="transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0 md:flex-1"
              onClick={close}
            >
              {t(($) => $.neuronDetailModal.stakeMaturity.cancel)}
            </Button>
            <Button
              size="xl"
              className="md:flex-1"
              onClick={() => neuron && execute(() => mutateAsync({ neuronId: neuron.neuronId }))}
            >
              {t(($) => $.neuronDetailModal.stakeMaturity.confirm)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
