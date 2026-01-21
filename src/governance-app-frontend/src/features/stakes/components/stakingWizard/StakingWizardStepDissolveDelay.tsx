import { AlertTriangle, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';

import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from './constants';
import { StakingWizardDissolveDelayPreset } from './types';

interface Props {
  dissolveDelayMonths: StakingWizardDissolveDelayPreset;
  onDissolveDelayChange: (months: StakingWizardDissolveDelayPreset) => void;
  onNext: () => void;
}

export function StakingWizardStepDissolveDelay({
  dissolveDelayMonths,
  onDissolveDelayChange,
  onNext,
}: Props) {
  const { t } = useTranslation();

  // Separate regular options from the max rewards option
  const regularOptions = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.filter(
    (opt) => opt.value !== StakingWizardDissolveDelayPreset.EightYears,
  );
  const maxRewardsOption = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.find(
    (opt) => opt.value === StakingWizardDissolveDelayPreset.EightYears,
  )!;
  const isMaxRewardsSelected = dissolveDelayMonths === maxRewardsOption.value;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      data-testid="staking-wizard-dissolve-delay-step"
    >
      <p className="text-sm text-muted-foreground">
        {t(($) => $.stakeWizardModal.steps.dissolveDelay.description)}
      </p>

      <div>
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {regularOptions.map((option) => {
            const isSelected = dissolveDelayMonths === option.value;

            return (
              <button
                type="button"
                key={option.value}
                onClick={() => onDissolveDelayChange(option.value)}
                className={`rounded-lg border-2 px-4 py-4 text-center font-medium transition-colors outline-none focus-visible:bg-muted/70 active:bg-muted ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                data-testid={`staking-wizard-delay-option-${option.value}`}
                aria-pressed={isSelected}
              >
                {t(($) => $.stakeWizardModal.steps.dissolveDelay.presets[option.labelKey])}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onDissolveDelayChange(maxRewardsOption.value)}
          className={`w-full rounded-lg border-2 px-4 py-4 text-center transition-colors outline-none focus-visible:from-green-600/18 focus-visible:to-green-600/10 active:from-green-600/20 active:to-green-600/12 ${
            isMaxRewardsSelected
              ? 'border-green-600 bg-gradient-to-br from-green-600/12 to-green-600/4'
              : 'border-green-600/30 bg-gradient-to-br from-green-600/8 to-green-600/4 hover:bg-gradient-to-br hover:from-green-600/14 hover:to-green-600/8'
          }`}
          data-testid={`staking-wizard-delay-option-${maxRewardsOption.value}`}
          aria-pressed={isMaxRewardsSelected}
        >
          <span className="font-medium">
            {t(($) => $.stakeWizardModal.steps.dissolveDelay.presets[maxRewardsOption.labelKey])}
          </span>
          <span className="ml-2 inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
            <Award className="h-3 w-3" />
            {t(($) => $.stakeWizardModal.badges.maxRewards)}
          </span>
        </button>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t(($) => $.stakeWizardModal.infoBoxes.dissolveDelayWarning)}
        </AlertDescription>
      </Alert>

      <Button
        type="submit"
        size="xl"
        className="w-full uppercase"
        data-testid="staking-wizard-next-btn"
      >
        {t(($) => $.common.next)}
      </Button>
    </form>
  );
}
