import '@/i18n/config';

import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelPendingDeviceAction } from '@hooks/useDeviceAction';
import { clearDeviceApprovals, runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';

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

  it('counts the device approvals and lists the steps in order with their purpose', () => {
    renderStep([
      DeviceApprovalStep.Transfer,
      DeviceApprovalStep.Hotkey,
      DeviceApprovalStep.DissolveDelay,
      DeviceApprovalStep.AutoStake,
      DeviceApprovalStep.StartDissolving,
    ]);

    const box = screen.getByTestId('staking-wizard-device-approvals');
    expect(box.textContent).toContain('5 approvals on your Ledger device');
    expect(
      within(box)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      '1.Transfer Moves the ICP to the neuron.',
      '2.Hotkey Lets this app show and vote with the neuron.',
      '3.Lock period Sets the lock period of the neuron.',
      '4.Auto-lock Locks the rewards into the neuron.',
      '5.Unlocking Starts the unlocking of the neuron.',
    ]);
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

describe('StakingWizardStepConfirmation while the device answers a cancelled request', () => {
  const DEVICE = 'aaaaa-aa';
  const HINT = 'Approve or reject on your Ledger device to continue.';

  beforeEach(() => {
    clearDeviceQueues();
    clearDeviceApprovals();
  });

  const renderProcessing = (signer?: { kind: 'ledger'; principal: string }) =>
    render(
      <StakingWizardStepConfirmation
        formState={formState}
        isProcessing
        currentStep={StakingWizardCreateNeuronStep.CreateNeuron}
        error={null}
        expectedApy="~10%"
        signer={signer}
        onDone={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

  it('tells the user to answer on the device for a Ledger device account', async () => {
    void runApprovedDeviceCall(DEVICE, () => new Promise<void>(() => undefined), {
      description: 'Check the amount on the device screen and approve.',
    }).catch(() => undefined);
    await act(async () => undefined);
    await act(async () => cancelPendingDeviceAction());

    renderProcessing({ kind: 'ledger', principal: DEVICE });

    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('shows no hint for a session account', async () => {
    void runApprovedDeviceCall(DEVICE, () => new Promise<void>(() => undefined), {
      description: 'Check the amount on the device screen and approve.',
    }).catch(() => undefined);
    await act(async () => undefined);
    await act(async () => cancelPendingDeviceAction());

    renderProcessing();

    expect(screen.queryByText(HINT)).toBeNull();
  });
});
