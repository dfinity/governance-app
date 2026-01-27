import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';

import { useToggleDissolving } from '../../hooks/useToggleDissolving';

type Props = {
  neuron: NeuronInfo;
  isDissolved: boolean;
  isDissolving: boolean;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function NeuronDetailDissolveView({
  neuron,
  isDissolved,
  isDissolving,
  onSuccess,
  onProcessingChange,
}: Props) {
  const { t } = useTranslation();

  const { mutateAsync, isPending } = useToggleDissolving();

  const handleConfirm = async () => {
    onProcessingChange(true);

    try {
      await mutateAsync({
        neuronId: neuron.neuronId,
        startDissolving: !isDissolving,
      });

      successNotification({
        description: isDissolving
          ? t(($) => $.neuronDetailModal.dissolve.successStop)
          : t(($) => $.neuronDetailModal.dissolve.successStart),
      });

      // Wait for the navigation blocker to be released (isPending propagated to false)
      setTimeout(onSuccess);
    } catch (err) {
      errorNotification({
        description: mapGovernanceCanisterError(err as Error),
      });
    } finally {
      onProcessingChange(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPending) {
      handleConfirm();
    }
  };

  // If already dissolved, show info message and disable action
  if (isDissolved) {
    return (
      <div className="flex flex-col gap-4">
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {t(($) => $.neuronDetailModal.dissolve.alreadyDissolved)}
          </AlertDescription>
        </Alert>

        <Button
          type="button"
          size="xl"
          className="w-full"
          disabled
          data-testid="dissolve-confirm-btn"
        >
          {t(($) => $.neuronDetailModal.dissolve.confirmStart)}
        </Button>
      </div>
    );
  }

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
        disabled={isPending}
        variant={isDissolving ? 'default' : 'destructive'}
        data-testid="dissolve-confirm-btn"
      >
        {isPending ? (
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
