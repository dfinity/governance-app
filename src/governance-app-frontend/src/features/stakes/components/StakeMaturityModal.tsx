import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Info, Loader2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { mapCanisterError } from '@utils/errors';
import { getNeuronFreeMaturityE8s } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';
import { formatNumber } from '@utils/numbers';

import { useStakeMaturity } from '../hooks/useStakeMaturity';

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StakeMaturityModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useStakeMaturity();

  const unstakedMaturity = neuron ? bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn) : 0;

  const handleConfirm = async () => {
    if (!neuron) return;
    try {
      await mutateAsync({ neuronId: neuron.neuronId });
      successNotification({
        description: t(($) => $.neuronDetailModal.stakeMaturity.success),
      });
      onOpenChange(false);
    } catch (err) {
      errorNotification({
        description: mapCanisterError(err as Error),
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isPending && !open) return;
    onOpenChange(open);
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange} dismissible={!isPending}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col focus:outline-none sm:max-w-md"
        showCloseButton={!isPending}
        data-testid="stake-maturity-modal"
      >
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>
            {t(($) => $.neuronDetailModal.stakeMaturity.title)}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="mt-4 flex flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0">
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

          <div className="flex gap-3">
            {!isPending && (
              <Button
                variant="outline"
                size="xl"
                className="flex-1 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t(($) => $.neuronDetailModal.stakeMaturity.cancel)}
              </Button>
            )}
            <Button size="xl" className="flex-1" onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(($) => $.neuronDetailModal.stakeMaturity.confirming)}
                </>
              ) : (
                t(($) => $.neuronDetailModal.stakeMaturity.confirm)
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
