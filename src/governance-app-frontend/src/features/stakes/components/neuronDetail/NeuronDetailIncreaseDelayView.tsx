import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Key, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { MaxRewardsBadge } from '@components/MaxRewardsBadge';
import { SECONDS_IN_MONTH } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { mapCanisterError } from '@utils/errors';
import { getNeuronDissolveDelaySeconds } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useIncreaseDelay } from '../../hooks/useIncreaseDelay';
import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from '../stakingWizard/constants';
import { StakingWizardDissolveDelayPreset } from '../stakingWizard/types';

type Props = {
  neuron: NeuronInfo;
  isHotkey: boolean;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function NeuronDetailIncreaseDelayView({
  neuron,
  isHotkey,
  onSuccess,
  onProcessingChange,
}: Props) {
  const { t } = useTranslation();
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);

  const { mutateAsync, isPending } = useIncreaseDelay();

  // Get current dissolve delay in months
  const currentDelaySeconds = Number(getNeuronDissolveDelaySeconds(neuron));
  const currentDelayMonths = Math.round(currentDelaySeconds / SECONDS_IN_MONTH);

  const isMaxDelay = currentDelayMonths >= ICP_MAX_DISSOLVE_DELAY_MONTHS;

  const handleConfirm = async () => {
    if (!selectedMonths) return;

    onProcessingChange(true);

    try {
      await mutateAsync({
        neuronId: neuron.neuronId,
        dissolveDelayMonths: selectedMonths,
      });

      successNotification({
        description: t(($) => $.neuronDetailModal.increaseDelay.success),
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
    if (!isPending && selectedMonths) {
      handleConfirm();
    }
  };

  // Separate regular options from max rewards option
  const regularOptions = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.filter(
    (opt) => opt.value !== StakingWizardDissolveDelayPreset.TwoYears,
  );
  const maxRewardsOption = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.find(
    (opt) => opt.value === StakingWizardDissolveDelayPreset.TwoYears,
  )!;

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

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t(($) => $.neuronDetailModal.increaseDelay.warning)}</AlertDescription>
      </Alert>

      <div>
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {regularOptions.map((option) => {
            const isSelected = selectedMonths === option.value;
            const isDisabled = option.value <= currentDelayMonths;

            return (
              <button
                type="button"
                key={option.value}
                onClick={() => !isDisabled && !isHotkey && setSelectedMonths(option.value)}
                disabled={isDisabled || isPending || isHotkey}
                className={`rounded-lg border-2 px-4 py-4 text-center font-medium transition-colors outline-none focus-visible:bg-muted/70 active:bg-muted ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isDisabled
                      ? 'cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/50'
                      : 'border-border hover:bg-muted/50'
                }`}
                data-testid={`increase-delay-option-${option.value}`}
                aria-pressed={isSelected}
              >
                <span>{t(($) => $.neuronDetailModal.increaseDelay.presets[option.labelKey])}</span>
              </button>
            );
          })}
        </div>

        {/* Max rewards option */}
        {(() => {
          const isSelected = selectedMonths === maxRewardsOption.value;
          const isDisabled = maxRewardsOption.value === currentDelayMonths;

          return (
            <button
              type="button"
              onClick={() => !isDisabled && !isHotkey && setSelectedMonths(maxRewardsOption.value)}
              disabled={isDisabled || isPending || isHotkey}
              className={`w-full rounded-lg border-2 px-4 py-4 text-center transition-colors outline-none ${
                isSelected
                  ? 'border-green-600 bg-gradient-to-br from-green-600/12 to-green-600/4'
                  : isDisabled
                    ? 'cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/50'
                    : 'border-green-600/30 bg-gradient-to-br from-green-600/8 to-green-600/4 hover:from-green-600/14 hover:to-green-600/8 focus-visible:from-green-600/18 focus-visible:to-green-600/10'
              }`}
              data-testid={`increase-delay-option-${maxRewardsOption.value}`}
              aria-pressed={isSelected}
            >
              <span className="font-medium">
                {t(($) => $.neuronDetailModal.increaseDelay.presets[maxRewardsOption.labelKey])}
              </span>
              {!isDisabled && (
                <span className="ml-2">
                  <MaxRewardsBadge />
                </span>
              )}
            </button>
          );
        })()}
      </div>

      {isMaxDelay && (
        <p className="text-center text-sm text-muted-foreground">
          {t(($) => $.neuronDetailModal.increaseDelay.alreadyMax)}
        </p>
      )}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={isPending || !selectedMonths || isHotkey}
        data-testid="increase-delay-confirm-btn"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t(($) => $.neuronDetailModal.increaseDelay.confirming)}
          </>
        ) : (
          t(($) => $.neuronDetailModal.increaseDelay.confirm)
        )}
      </Button>
    </form>
  );
}
