import { Info, Usb } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { MaxRewardsBadge } from '@components/MaxRewardsBadge';
import { SegmentedToggle } from '@components/SegmentedToggle';

import { DeviceApprovalStep } from '../../utils/ledgerStake';
import { StakingWizardInitialState, StakingWizardMaturityMode } from './types';

interface Props {
  maturityMode: StakingWizardMaturityMode;
  initialState: StakingWizardInitialState;
  onMaturityModeChange: (mode: StakingWizardMaturityMode) => void;
  onInitialStateChange: (state: StakingWizardInitialState) => void;
  onConfirm: () => void;
  /** The approvals the stake asks on the Ledger device. Empty for a session account. */
  deviceApprovalSteps?: DeviceApprovalStep[];
}

type Translate = ReturnType<typeof useTranslation>['t'];

const getApprovalStepName = (step: DeviceApprovalStep, t: Translate): string => {
  switch (step) {
    case DeviceApprovalStep.Transfer:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalSteps.transfer);
    case DeviceApprovalStep.Hotkey:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalSteps.hotkey);
    case DeviceApprovalStep.DissolveDelay:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalSteps.dissolveDelay);
    case DeviceApprovalStep.AutoStake:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalSteps.autoStake);
    case DeviceApprovalStep.StartDissolving:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalSteps.startDissolving);
  }
};

/** What the step does, one short line under the step name. */
const getApprovalPurpose = (step: DeviceApprovalStep, t: Translate): string => {
  switch (step) {
    case DeviceApprovalStep.Transfer:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalPurposes.transfer);
    case DeviceApprovalStep.Hotkey:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalPurposes.hotkey);
    case DeviceApprovalStep.DissolveDelay:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalPurposes.dissolveDelay);
    case DeviceApprovalStep.AutoStake:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalPurposes.autoStake);
    case DeviceApprovalStep.StartDissolving:
      return t(($) => $.stakeWizardModal.ledgerDevice.approvalPurposes.startDissolving);
  }
};

export function StakingWizardStepConfiguration({
  maturityMode,
  initialState,
  onMaturityModeChange,
  onInitialStateChange,
  onConfirm,
  deviceApprovalSteps = [],
}: Props) {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      data-testid="staking-wizard-configuration-step"
    >
      {/* Maturity Mode Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-normal">
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
          <h3 className="text-lg font-normal">
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

      {deviceApprovalSteps.length > 0 && (
        <div
          className="grid grid-cols-[calc(var(--spacing)*4)_1fr] items-start gap-x-3 gap-y-0.5 rounded-lg bg-muted p-3"
          data-testid="staking-wizard-device-approvals"
        >
          <Usb className="size-4 translate-y-0.5 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium">
            {t(($) => $.stakeWizardModal.ledgerDevice.approvals, {
              count: deviceApprovalSteps.length,
            })}
          </p>
          <ol className="col-start-2 flex flex-col gap-0.5 text-[13px]">
            {deviceApprovalSteps.map((step, index) => (
              <li key={step} className="flex gap-1.5">
                <span className="shrink-0 text-muted-foreground tabular-nums">{index + 1}.</span>
                <span>
                  <span className="font-medium">{getApprovalStepName(step, t)}</span>{' '}
                  <span className="text-muted-foreground">{getApprovalPurpose(step, t)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Button
        type="submit"
        size="xl"
        className="w-full uppercase"
        data-testid="staking-wizard-create-btn"
      >
        {t(($) => $.stakeWizardModal.steps.configuration.confirm)}
      </Button>
    </form>
  );
}
