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

import { clearLedgerApprovals, useLedgerNeuronCall } from './useLedgerNeuronCall';

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
    clearLedgerApprovals();
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
    await flush();

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

  it('opens the approval dialog only when the queue turn starts', async () => {
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
    expect(result.current.pending).toBeNull();
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();

    await act(async () => {
      turn.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.pending?.description).toBe(OPTIONS.description);
    expect(call).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve();
      await run;
    });
    expect(result.current.pending).toBeNull();
  });

  it('holds the next action, and its dialog, until the cancelled request settles', async () => {
    const { runOnDevice } = await vi.importActual<typeof import('@common/ledger/deviceQueue')>(
      '@common/ledger/deviceQueue',
    );
    mocks.runOnDevice.mockImplementation(runOnDevice);
    const { result } = renderCall();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.run(first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = result.current.run(second, { ...OPTIONS, description: 'Second request' });
    });
    await flush();
    expect(result.current.pending).toBeNull();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve();
      await expect(firstRun).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
    await act(async () => {
      await secondRun;
    });
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
  });

  it('holds the dialog of another device until the cancelled request settles', async () => {
    const { result } = renderCall();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.run(first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = result.current.run(second, {
        ...OPTIONS,
        principal: 'other-device',
        description: 'Second device',
      });
    });
    await flush();
    expect(result.current.pending).toBeNull();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve();
      await expect(firstRun).rejects.toBeInstanceOf(DeviceActionCancelledError);
      await secondRun;
    });
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
  });

  it('rejects a request that waited behind another device when a logout came in between', async () => {
    const queue = await vi.importActual<typeof import('@common/ledger/deviceQueue')>(
      '@common/ledger/deviceQueue',
    );
    mocks.runOnDevice.mockImplementation(queue.runOnDevice);
    const { result } = renderCall();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.run(first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = result.current.run(second, { ...OPTIONS, principal: 'other-device' });
    });
    await flush();
    queue.clearDeviceQueues();

    await act(async () => {
      signing.resolve();
      await expect(firstRun).rejects.toBeInstanceOf(DeviceActionCancelledError);
      await expect(secondRun).rejects.toMatchObject({ code: LedgerErrorCode.SessionClosed });
    });
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
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
  });

  it('stays pending after a cancel until the device answers, and reports a late approval', async () => {
    const { result } = renderCall();
    const signing = deferred<void>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<void>;
    act(() => {
      run = result.current.run(call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();

    // The caller waits for the device call, so no second request can start.
    const settled = await Promise.race([
      run.then(
        () => true,
        () => true,
      ),
      Promise.resolve(false),
    ]);
    expect(settled).toBe(false);

    await act(async () => {
      signing.resolve();
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
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
