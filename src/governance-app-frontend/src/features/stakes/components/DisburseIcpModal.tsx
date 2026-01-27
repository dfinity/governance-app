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
import { getNeuronStakeE8s } from '@utils/neuron';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { formatNumber } from '@utils/numbers';

import { useDisburseNeuron } from '../hooks/useDisburseNeuron';

type Props = {
  neuron: NeuronInfo;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseIcpModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useDisburseNeuron();

  const stakedAmount = bigIntDiv(getNeuronStakeE8s(neuron), E8Sn);

  const handleConfirm = async () => {
    try {
      await mutateAsync({ neuronId: neuron.neuronId });
      successNotification({
        description: t(($) => $.neuronDetailModal.disburseIcp.success),
      });
      onOpenChange(false);
    } catch (err) {
      errorNotification({
        description: mapGovernanceCanisterError(err as Error),
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
        data-testid="disburse-icp-modal"
      >
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>
            {t(($) => $.neuronDetailModal.disburseIcp.title)}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="mt-4 flex flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0">
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <Trans
                i18nKey={($) => $.neuronDetailModal.disburseIcp.info}
                t={t}
                values={{ amount: formatNumber(stakedAmount) }}
                components={{ strong: <strong /> }}
              />
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            {!isPending && (
              <Button
                variant="secondary"
                size="xl"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t(($) => $.neuronDetailModal.disburseIcp.cancel)}
              </Button>
            )}
            <Button size="xl" className="flex-1" onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(($) => $.neuronDetailModal.disburseIcp.confirming)}
                </>
              ) : (
                t(($) => $.neuronDetailModal.disburseIcp.confirm)
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
