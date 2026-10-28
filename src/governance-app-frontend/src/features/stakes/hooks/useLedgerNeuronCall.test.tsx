import '@/i18n/config';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';

import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
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
  getDeviceSessionGeneration: () => 0,
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

// The dialog opens one tick after the call starts: after the queue turn and the approval chain.
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('useLedgerNeuronCall', () => {
  beforeEach(() => {
    mocks.getNnsGovernanceCanister.mockReset().mockResolvedValue({ stakeMaturity: vi.fn() });
    mocks.runOnDevice.mockReset().mockImplementation((_principal, call) => call());
    mocks.event.mockReset();
    clearDeviceApprovals();
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

  it('opens the approval dialog with the description and the detail at the queue turn', async () => {
    const { result } = renderCall();
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementation(async (_principal, call) => {
      await turn.promise;
      return call();
    });
    const signing = deferred<void>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await flush();
    expect(result.current.pending).toBeNull();
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();

    await act(async () => {
      turn.resolve();
    });
    await flush();
    expect(result.current.pending?.description).toBe(OPTIONS.description);
    expect(result.current.pending?.detail).toBe(OPTIONS.detail);
    expect(call).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve();
      await run;
    });
    expect(result.current.pending).toBeNull();
  });

  it('never starts the signing call when the cancel comes during the connection', async () => {
    const { result } = renderCall();
    const connection = deferred<{ stakeMaturity: () => Promise<void> }>();
    mocks.getNnsGovernanceCanister.mockReturnValue(connection.promise);
    const call = vi.fn();

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());

    await act(async () => {
      connection.resolve({ stakeMaturity: vi.fn() });
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledTimes(1);
    expect(call).not.toHaveBeenCalled();
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceActionError, {
      action: 'stake_maturity',
      reason: 'cancelled',
    });
  });

  it('reports a late approval after a cancel as the action, not as an error', async () => {
    const { result } = renderCall();
    const signing = deferred<string>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<string>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();

    await act(async () => {
      signing.resolve('signed');
      await expect(run).resolves.toBe('signed');
    });
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceAction, {
      action: 'stake_maturity',
    });
    expect(mocks.event).not.toHaveBeenCalledWith(
      AnalyticsEvent.LedgerDeviceActionError,
      expect.anything(),
    );
  });

  it('reports the cancel when the device rejects the request after the cancel', async () => {
    const { result } = renderCall();
    const signing = deferred<void>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());

    await act(async () => {
      signing.reject(new LedgerDeviceError(LedgerErrorCode.UserRejected));
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
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
