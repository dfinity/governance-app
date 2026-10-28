import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';

import { clearDeviceApprovals, runApprovedDeviceCall } from './approvedDeviceCall';
import { LedgerDeviceError, LedgerErrorCode } from './errors';

const mocks = vi.hoisted(() => ({
  runOnDevice: vi.fn(),
  generation: vi.fn(() => 0),
}));

vi.mock('./deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
  getDeviceSessionGeneration: () => mocks.generation(),
}));

const DEVICE = 'aaaaa-aa';
const OTHER_DEVICE = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

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
  description: 'Check the amount on the device screen and approve the transfer.',
  detail: (
    <span className="flex flex-col gap-1">
      <span>2.5 ICP</span>
      <span>{OTHER_DEVICE}</span>
    </span>
  ),
};

const renderPending = () => renderHook(() => usePendingDeviceAction());

// The dialog opens one tick after the call starts: after the queue turn and the approval chain.
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const actualQueue = () => vi.importActual<typeof import('./deviceQueue')>('./deviceQueue');

describe('runApprovedDeviceCall', () => {
  beforeEach(() => {
    mocks.runOnDevice.mockReset().mockImplementation((_principal, call) => call());
    mocks.generation.mockReset().mockReturnValue(0);
    clearDeviceApprovals();
  });

  it('runs the call inside the device queue and resolves with its result', async () => {
    const call = vi.fn().mockResolvedValue('signed');

    let outcome: string | undefined;
    await act(async () => {
      outcome = await runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });

    expect(outcome).toBe('signed');
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE, expect.any(Function));
    expect(call).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('shows the approval dialog with the description and the detail while the call runs', async () => {
    const { result } = renderPending();
    const signing = deferred<void>();

    let run!: Promise<void>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, () => signing.promise, OPTIONS);
    });
    await flush();

    expect(result.current?.description).toBe(OPTIONS.description);
    render(<>{result.current?.detail}</>);
    expect(screen.getByText('2.5 ICP')).toBeTruthy();
    expect(screen.getByText(OTHER_DEVICE)).toBeTruthy();

    await act(async () => {
      signing.resolve();
      await run;
    });
    expect(result.current).toBeNull();
  });

  it('opens the approval dialog only when the queue turn starts', async () => {
    const { result } = renderPending();
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementation(async (_principal, call) => {
      await turn.promise;
      return call();
    });
    const signing = deferred<void>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<void>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });
    await flush();
    expect(result.current).toBeNull();
    expect(call).not.toHaveBeenCalled();

    await act(async () => {
      turn.resolve();
    });
    await flush();
    expect(result.current?.description).toBe(OPTIONS.description);
    expect(call).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve();
      await run;
    });
    expect(result.current).toBeNull();
  });

  it('holds the next call to the same device, and its dialog, until the cancelled request settles', async () => {
    const { runOnDevice } = await actualQueue();
    mocks.runOnDevice.mockImplementation(runOnDevice);
    const { result } = renderPending();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = runApprovedDeviceCall(DEVICE, first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = runApprovedDeviceCall(DEVICE, second, { description: 'Second request' });
    });
    await flush();
    expect(result.current).toBeNull();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve();
      await firstRun;
    });
    await act(async () => {
      await secondRun;
    });
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
  });

  it('holds the dialog of another device until the cancelled request settles', async () => {
    const { result } = renderPending();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = runApprovedDeviceCall(DEVICE, first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = runApprovedDeviceCall(OTHER_DEVICE, second, { description: 'Second device' });
    });
    await flush();
    expect(result.current).toBeNull();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve();
      await firstRun;
      await secondRun;
    });
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
  });

  it('rejects a call that waited behind another device when a logout came in between', async () => {
    const queue = await actualQueue();
    mocks.runOnDevice.mockImplementation(queue.runOnDevice);
    mocks.generation.mockImplementation(queue.getDeviceSessionGeneration);
    const { result } = renderPending();
    const signing = deferred<void>();
    const first = vi.fn().mockReturnValue(signing.promise);
    const second = vi.fn().mockResolvedValue(undefined);

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = runApprovedDeviceCall(DEVICE, first, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    act(() => {
      secondRun = runApprovedDeviceCall(OTHER_DEVICE, second, OPTIONS);
    });
    await flush();
    queue.clearDeviceQueues();

    await act(async () => {
      signing.resolve();
      // The late signature belongs to the closed session, and the waiting call never starts.
      await expect(firstRun).rejects.toMatchObject({ code: LedgerErrorCode.SessionClosed });
      await expect(secondRun).rejects.toMatchObject({ code: LedgerErrorCode.SessionClosed });
    });
    expect(second).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('rejects a late signature that arrives after a logout, so the flow does not go on in the next session', async () => {
    const queue = await actualQueue();
    mocks.generation.mockImplementation(queue.getDeviceSessionGeneration);
    const { result } = renderPending();
    const signing = deferred<string>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<string>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });
    await flush();
    // The logout closes the dialog and starts a new session while the device still asks.
    act(() => cancelPendingDeviceAction());
    queue.clearDeviceQueues();

    await act(async () => {
      signing.resolve('signed');
      await expect(run).rejects.toMatchObject({ code: LedgerErrorCode.SessionClosed });
    });
    expect(result.current).toBeNull();
  });

  it('starts a new approval chain after a logout, so a request without answer does not block', async () => {
    const queue = await actualQueue();
    mocks.generation.mockImplementation(queue.getDeviceSessionGeneration);
    const { result } = renderPending();
    const unanswered = deferred<void>();
    const first = vi.fn().mockReturnValue(unanswered.promise);
    const signing = deferred<void>();
    const second = vi.fn().mockReturnValue(signing.promise);

    act(() => {
      void runApprovedDeviceCall(DEVICE, first, OPTIONS).catch(() => undefined);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    queue.clearDeviceQueues();

    let secondRun!: Promise<void>;
    act(() => {
      secondRun = runApprovedDeviceCall(DEVICE, second, { description: 'Next session' });
    });
    await flush();
    expect(result.current?.description).toBe('Next session');
    expect(second).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve();
      await secondRun;
    });
    expect(result.current).toBeNull();
  });

  it('aborts the signal on a cancel and rejects when the call stops before the signature', async () => {
    const { result } = renderPending();
    const connection = deferred<void>();
    const call = vi.fn(async (signal: AbortSignal) => {
      await connection.promise;
      if (signal.aborted) throw new DeviceActionCancelledError();
      return 'signed';
    });

    let run!: Promise<string>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());

    await act(async () => {
      connection.resolve();
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
    expect(result.current).toBeNull();
  });

  it('stays pending after a cancel until the device answers, and resolves on a late approval', async () => {
    const { result } = renderPending();
    const signing = deferred<string>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<string>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect(result.current).toBeNull();

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
      signing.resolve('signed');
      await expect(run).resolves.toBe('signed');
    });
  });

  it('reports the cancel when the device rejects the request after the cancel', async () => {
    const signing = deferred<void>();
    const call = vi.fn().mockReturnValue(signing.promise);

    let run!: Promise<void>;
    act(() => {
      run = runApprovedDeviceCall(DEVICE, call, OPTIONS);
    });
    await flush();
    act(() => cancelPendingDeviceAction());

    await act(async () => {
      signing.reject(new LedgerDeviceError(LedgerErrorCode.UserRejected));
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
  });

  it('forwards a device error and closes the dialog', async () => {
    const { result } = renderPending();
    const call = vi.fn().mockRejectedValue(new LedgerDeviceError(LedgerErrorCode.UserRejected));

    await act(async () => {
      await expect(runApprovedDeviceCall(DEVICE, call, OPTIONS)).rejects.toBeInstanceOf(
        LedgerDeviceError,
      );
    });

    expect(result.current).toBeNull();
  });
});
