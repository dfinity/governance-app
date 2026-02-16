import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Info, Key, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { MaxRewardsBadge } from '@components/MaxRewardsBadge';
import { SegmentedToggle, type SegmentedToggleValue } from '@components/SegmentedToggle';
import { mapCanisterError } from '@utils/errors';
import { getNeuronIsAutoStakingMaturity } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useToggleMaturityMode } from '../../hooks/useToggleMaturityMode';

type Props = {
  neuron: NeuronInfo;
  isHotkey: boolean;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function NeuronDetailMaturityModeView({ neuron, isHotkey, onSuccess, onProcessingChange }: Props) {
  const { t } = useTranslation();

  const currentMode: SegmentedToggleValue = getNeuronIsAutoStakingMaturity(neuron)
    ? 'left'
    : 'right';
  const [selectedMode, setSelectedMode] = useState<SegmentedToggleValue>(currentMode);

  const { mutateAsync, isPending } = useToggleMaturityMode();

  const handleConfirm = async () => {
    if (selectedMode === currentMode) {
      return;
    }

    onProcessingChange(true);

    try {
      await mutateAsync({
        neuronId: neuron.neuronId,
        autoStake: selectedMode === 'left',
      });

      successNotification({
        description: t(($) => $.neuronDetailModal.maturityMode.success),
      });

      // Wait for the navigation blocker to be released (isPending propagated to false)
      setTimeout(onSuccess);
    } catch (err) {
      errorNotification({
        description: mapCanisterError(err as Error),
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

  const hasChanges = selectedMode !== currentMode;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isHotkey && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
          <Key className="h-4 w-4" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {t(($) => $.neuronDetailModal.hotkeyNotice)}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <div>
            <Trans
              i18nKey={($) => $.neuronDetailModal.maturityMode.infoAutoStake}
              t={t}
              components={{ strong: <strong /> }}
            />
            <br />
            <Trans
              i18nKey={($) => $.neuronDetailModal.maturityMode.infoKeepLiquid}
              t={t}
              components={{ strong: <strong /> }}
            />
          </div>
        </AlertDescription>
      </Alert>

      <SegmentedToggle
        value={selectedMode}
        onValueChange={(v) => !isPending && !isHotkey && setSelectedMode(v)}
        leftLabel={t(($) => $.neuronDetailModal.maturityMode.autoStake)}
        rightLabel={t(($) => $.neuronDetailModal.maturityMode.keepLiquid)}
        highlightedValue="left"
        leftSubLabel={<MaxRewardsBadge />}
        ariaLabel={t(($) => $.neuronDetailModal.maturityMode.title)}
      />

      {!hasChanges && (
        <p className="text-center text-sm text-muted-foreground">
          {t(($) => $.neuronDetailModal.maturityMode.noChange)}
        </p>
      )}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={isPending || !hasChanges || isHotkey}
        data-testid="maturity-mode-confirm-btn"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t(($) => $.neuronDetailModal.maturityMode.confirming)}
          </>
        ) : (
          t(($) => $.neuronDetailModal.maturityMode.confirm)
        )}
      </Button>
    </form>
  );
}
