import { ChevronDown, Info, Usb } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { AnimatedCollapse } from '@components/AnimatedCollapse';
import { Button } from '@components/button';
import { MaxRewardsBadge } from '@components/MaxRewardsBadge';
import { SegmentedToggle } from '@components/SegmentedToggle';
import { cn } from '@utils/shadcn';

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
  // The step list is folded by default: the count is the message, the list is the detail.
  const [approvalsExpanded, setApprovalsExpanded] = useState(false);

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
        <div className="rounded-lg bg-muted" data-testid="staking-wizard-device-approvals">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-foreground/5"
            onClick={() => setApprovalsExpanded((value) => !value)}
            aria-expanded={approvalsExpanded}
            aria-controls="staking-wizard-device-approval-steps"
            data-testid="staking-wizard-device-approvals-toggle"
          >
            <Usb className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium">
              {t(($) => $.stakeWizardModal.ledgerDevice.approvals, {
                count: deviceApprovalSteps.length,
              })}
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform',
                approvalsExpanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
          <AnimatedCollapse open={approvalsExpanded}>
            <ol
              id="staking-wizard-device-approval-steps"
              className="flex flex-col gap-0.5 px-3 pb-3 pl-10 text-[13px]"
            >
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
          </AnimatedCollapse>
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
