import { Award, Info } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { SegmentedToggle } from '@components/SegmentedToggle';

import { StakingWizardInitialState, StakingWizardMaturityMode } from './types';

interface Props {
  maturityMode: StakingWizardMaturityMode;
  initialState: StakingWizardInitialState;
  onMaturityModeChange: (mode: StakingWizardMaturityMode) => void;
  onInitialStateChange: (state: StakingWizardInitialState) => void;
  onConfirm: () => void;
}

export function StakingWizardStepConfiguration({
  maturityMode,
  initialState,
  onMaturityModeChange,
  onInitialStateChange,
  onConfirm,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      {/* Maturity Mode Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.stakeWizardModal.steps.configuration.maturity.label)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.configuration.maturity.description)}
          </p>
        </div>

        <SegmentedToggle
          value={maturityMode === StakingWizardMaturityMode.Auto ? 'left' : 'right'}
          onValueChange={(v) =>
            onMaturityModeChange(
              v === 'left' ? StakingWizardMaturityMode.Auto : StakingWizardMaturityMode.Liquid,
            )
          }
          leftLabel={t(($) => $.stakeWizardModal.steps.configuration.maturity.autoStake)}
          rightLabel={t(($) => $.stakeWizardModal.steps.configuration.maturity.keepLiquid)}
          highlightedValue="left"
          leftSubLabel={<MaxRewardsBadge />}
          ariaLabel={t(($) => $.stakeWizardModal.steps.configuration.maturity.label)}
        />
      </div>

      {/* Initial State Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.stakeWizardModal.steps.configuration.state.label)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.configuration.state.description)}
          </p>
        </div>

        <SegmentedToggle
          value={initialState === StakingWizardInitialState.Locked ? 'left' : 'right'}
          onValueChange={(v) =>
            onInitialStateChange(
              v === 'left'
                ? StakingWizardInitialState.Locked
                : StakingWizardInitialState.Dissolving,
            )
          }
          leftLabel={t(($) => $.stakeWizardModal.steps.configuration.state.locked)}
          rightLabel={t(($) => $.stakeWizardModal.steps.configuration.state.unlocking)}
          highlightedValue="left"
          leftSubLabel={<MaxRewardsBadge />}
          ariaLabel={t(($) => $.stakeWizardModal.steps.configuration.state.label)}
        />
      </div>

      {/* Info Box */}
      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <div>
            <Trans
              i18nKey={($) => $.stakeWizardModal.infoBoxes.lockedDescription}
              t={t}
              components={{ strong: <strong /> }}
            />
            <br />
            <Trans
              i18nKey={($) => $.stakeWizardModal.infoBoxes.unlockingDescription}
              t={t}
              components={{ strong: <strong /> }}
            />
          </div>
        </AlertDescription>
      </Alert>

      <Button onClick={onConfirm} size="xl" className="w-full uppercase">
        {t(($) => $.stakeWizardModal.steps.configuration.confirm)}
      </Button>
    </div>
  );
}

function MaxRewardsBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
      <Award className="h-3 w-3" />
      {t(($) => $.stakeWizardModal.badges.maxRewards)}
    </span>
  );
}
