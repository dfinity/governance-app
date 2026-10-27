import '@/i18n/config';

import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';

import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';
import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

import { useLedgerNeuronCall } from './useLedgerNeuronCall';

const mocks = vi.hoisted(() => ({
  getNnsGovernanceCanister: vi.fn(),
  runOnDevice: vi.fn(),
  event: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));

vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
}));

vi.mock('@features/analytics/service', () => ({
  analytics: { event: mocks.event },
}));

const DEVICE = 'aaaaa-aa';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const OPTIONS = {
  principal: DEVICE,
  action: 'stake_maturity' as const,
  description: 'Check the neuron ID on the device screen and approve.',
  detail: <DeviceActionDetail lines={['Neuron 7', 'Percentage: 100%']} />,
};

const renderCall = () =>
  renderHook(() => ({ run: useLedgerNeuronCall(), pending: usePendingDeviceAction() }));

describe('useLedgerNeuronCall', () => {
  beforeEach(() => {
    mocks.getNnsGovernanceCanister.mockReset().mockResolvedValue({ stakeMaturity: vi.fn() });
    mocks.runOnDevice.mockReset().mockImplementation((_principal, call) => call());
    mocks.event.mockReset();
  });

  it('runs the call with the device canister inside the device queue', async () => {
    const { result } = renderCall();
    const call = vi.fn().mockResolvedValue('signed');

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.run(call, OPTIONS);
    });

    expect(outcome).toBe('signed');
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE, expect.any(Function));
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({
      signer: { kind: 'ledger', principal: DEVICE },
    });
    expect(call).toHaveBeenCalledWith(await mocks.getNnsGovernanceCanister.mock.results[0].value);
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceAction, {
      action: 'stake_maturity',
    });
  });

  it('shows the approval dialog with the description and the detail while the call runs', async () => {
    const { result } = renderCall();
    const signing = deferred<void>();

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(() => signing.promise, OPTIONS);
    });

    expect(result.current.pending?.description).toBe(OPTIONS.description);
    render(<>{result.current.pending?.detail}</>);
    expect(screen.getByText('Neuron 7')).toBeTruthy();
    expect(screen.getByText('Percentage: 100%')).toBeTruthy();

    await act(async () => {
      signing.resolve();
      await run;
    });
    expect(result.current.pending).toBeNull();
  });

  it('rejects with a cancel error and never asks the device when the call waits in the queue', async () => {
    const { result } = renderCall();
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementation(async (_principal, call) => {
      await turn.promise;
      return call();
    });
    const call = vi.fn();

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await act(async () => {
      cancelPendingDeviceAction();
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });

    await act(async () => {
      turn.resolve();
      await turn.promise;
    });
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceActionError, {
      action: 'stake_maturity',
      reason: 'cancelled',
    });
  });

  it('forwards a device error and reports its code', async () => {
    const { result } = renderCall();
    const call = vi.fn().mockRejectedValue(new LedgerDeviceError(LedgerErrorCode.UserRejected));

    await act(async () => {
      await expect(result.current.run(call, OPTIONS)).rejects.toBeInstanceOf(LedgerDeviceError);
    });

    expect(result.current.pending).toBeNull();
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceActionError, {
      action: 'stake_maturity',
      reason: 'ledger_user_rejected',
    });
  });
});
