import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { errorNotification, successNotification } from '@utils/notification';

import { useToggleDissolving } from '../../hooks/useToggleDissolving';

type Props = {
  neuron: NeuronInfo;
  isDissolving: boolean;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function NeuronDetailDissolveView({
  neuron,
  isDissolving,
  onSuccess,
  onProcessingChange,
}: Props) {
  const { t } = useTranslation();

  const { execute, isProcessing } = useToggleDissolving();

  const handleConfirm = async () => {
    onProcessingChange(true);

    const result = await execute({
      neuronId: neuron.neuronId,
      startDissolving: !isDissolving,
    });

    onProcessingChange(false);

    if (result.success) {
      successNotification({
        description: isDissolving
          ? t(($) => $.neuronDetailModal.dissolve.successStop)
          : t(($) => $.neuronDetailModal.dissolve.successStart),
      });
      setTimeout(onSuccess);
    } else if (result.error) {
      errorNotification({
        description: result.error,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      handleConfirm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Warning Box */}
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <Trans
            i18nKey={
              isDissolving
                ? ($) => $.neuronDetailModal.dissolve.warningStop
                : ($) => $.neuronDetailModal.dissolve.warningStart
            }
            t={t}
            components={{ strong: <strong /> }}
          />
        </AlertDescription>
      </Alert>

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={isProcessing}
        variant={isDissolving ? 'default' : 'destructive'}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isDissolving
              ? t(($) => $.neuronDetailModal.dissolve.confirmingStop)
              : t(($) => $.neuronDetailModal.dissolve.confirmingStart)}
          </>
        ) : isDissolving ? (
          t(($) => $.neuronDetailModal.dissolve.confirmStop)
        ) : (
          t(($) => $.neuronDetailModal.dissolve.confirmStart)
        )}
      </Button>
    </form>
  );
}
