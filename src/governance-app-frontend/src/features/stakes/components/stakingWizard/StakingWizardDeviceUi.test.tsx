import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeviceApprovalStep } from '../../utils/ledgerStake';
import { StakingWizardStepConfiguration } from './StakingWizardStepConfiguration';
import { StakingWizardStepConfirmation } from './StakingWizardStepConfirmation';
import {
  StakingWizardCreateNeuronStep,
  StakingWizardDissolveDelayPreset,
  StakingWizardInitialState,
  StakingWizardMaturityMode,
} from './types';

const formState = {
  amount: '10',
  dissolveDelaySeconds: StakingWizardDissolveDelayPreset.SixMonths,
  maturityMode: StakingWizardMaturityMode.Auto,
  initialState: StakingWizardInitialState.Locked,
};

describe('StakingWizardStepConfiguration with a Ledger device account', () => {
  const renderStep = (deviceApprovalSteps?: DeviceApprovalStep[]) =>
    render(
      <StakingWizardStepConfiguration
        maturityMode={StakingWizardMaturityMode.Auto}
        initialState={StakingWizardInitialState.Locked}
        onMaturityModeChange={vi.fn()}
        onInitialStateChange={vi.fn()}
        onConfirm={vi.fn()}
        deviceApprovalSteps={deviceApprovalSteps}
      />,
    );

  it('counts the device approvals and lists the steps in order', () => {
    renderStep([
      DeviceApprovalStep.Transfer,
      DeviceApprovalStep.Hotkey,
      DeviceApprovalStep.DissolveDelay,
      DeviceApprovalStep.AutoStake,
      DeviceApprovalStep.StartDissolving,
    ]);

    const box = screen.getByTestId('staking-wizard-device-approvals');
    expect(box.textContent).toContain('5 approvals on your Ledger device');
    expect(box.textContent).toContain(
      'Transfer, Hotkey, Lock period, Auto-lock, Unlocking. One approval per step, in this order.',
    );
  });

  it('shows nothing for a session account', () => {
    renderStep();

    expect(screen.queryByTestId('staking-wizard-device-approvals')).toBeNull();
  });
});

describe('StakingWizardStepConfirmation after a device transfer whose claim failed', () => {
  const renderError = (isTransferDone: boolean) =>
    render(
      <StakingWizardStepConfirmation
        formState={formState}
        isProcessing={false}
        currentStep={StakingWizardCreateNeuronStep.CreateNeuron}
        error="The device is disconnected."
        isTransferDone={isTransferDone}
        expectedApy="~10%"
        onDone={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

  it('tells that the ICP waits in the neuron sub-account and keeps the error', () => {
    renderError(true);

    const box = screen.getByTestId('staking-wizard-transfer-done');
    expect(box.textContent).toContain('The transfer is done.');
    expect(box.textContent).toContain('Try again to claim the neuron.');
    expect(box.textContent).toContain('The device is disconnected.');
    expect(screen.getByText('Failed at: Reserving amount...')).toBeTruthy();
  });

  it('shows the plain error state when the transfer did not go through', () => {
    renderError(false);

    expect(screen.queryByTestId('staking-wizard-transfer-done')).toBeNull();
    expect(screen.getByTestId('staking-wizard-error')).toBeTruthy();
  });

  it('labels the hotkey step while processing', () => {
    render(
      <StakingWizardStepConfirmation
        formState={formState}
        isProcessing
        currentStep={StakingWizardCreateNeuronStep.AddHotkey}
        error={null}
        expectedApy="~10%"
        onDone={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Adding this app as hotkey...')).toBeTruthy();
  });
});
