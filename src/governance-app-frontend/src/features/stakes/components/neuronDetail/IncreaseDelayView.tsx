import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Award, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { SECONDS_IN_MONTH } from '@constants/extra';
import { getNeuronDissolveDelaySeconds } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';

import { useIncreaseDelay } from '../../hooks/useIncreaseDelay';
import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from '../stakingWizard/constants';
import { StakingWizardDissolveDelayPreset } from '../stakingWizard/types';

type Props = {
  neuron: NeuronInfo;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function IncreaseDelayView({ neuron, onSuccess, onProcessingChange }: Props) {
  const { t } = useTranslation();
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null);

  const { execute, isProcessing } = useIncreaseDelay();

  useEffect(() => {
    onProcessingChange(isProcessing);
  }, [isProcessing, onProcessingChange]);

  // Get current dissolve delay in months
  const currentDelaySeconds = Number(getNeuronDissolveDelaySeconds(neuron));
  const currentDelayMonths = Math.round(currentDelaySeconds / SECONDS_IN_MONTH);

  // Check if already at max delay (8 years = 96 months)
  const isMaxDelay = currentDelayMonths >= 96;

  const handleConfirm = async () => {
    if (!selectedMonths) return;

    const result = await execute({
      neuronId: neuron.neuronId,
      dissolveDelayMonths: selectedMonths,
    });

    if (result.success) {
      successNotification({
        description: t(($) => $.neuronDetailModal.increaseDelay.success),
      });
      onSuccess();
    } else if (result.error) {
      errorNotification({
        description: result.error,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessing && selectedMonths) {
      handleConfirm();
    }
  };

  // Separate regular options from max rewards option
  const regularOptions = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.filter(
    (opt) => opt.value !== StakingWizardDissolveDelayPreset.EightYears,
  );
  const maxRewardsOption = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.find(
    (opt) => opt.value === StakingWizardDissolveDelayPreset.EightYears,
  )!;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                onClick={() => !isDisabled && setSelectedMonths(option.value)}
                disabled={isDisabled || isProcessing}
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

        {/* Max rewards option (8 years) */}
        {(() => {
          const isSelected = selectedMonths === maxRewardsOption.value;
          const isDisabled = maxRewardsOption.value <= currentDelayMonths;

          return (
            <button
              type="button"
              onClick={() => !isDisabled && setSelectedMonths(maxRewardsOption.value)}
              disabled={isDisabled || isProcessing}
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
                <span className="ml-2 inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
                  <Award className="h-3 w-3" />
                  {t(($) => $.neuronDetailModal.increaseDelay.maxRewards)}
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
        disabled={isProcessing || !selectedMonths}
        data-testid="increase-delay-confirm-btn"
      >
        {isProcessing ? (
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
