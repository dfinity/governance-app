import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DeviceActionCancelledError,
  isDeviceActionCancelled,
  runDeviceAction,
  usePendingDeviceAction,
} from './useDeviceAction';

const OPTIONS = { description: 'Check the address on the device.' };

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('runDeviceAction', () => {
  it('opens the dialog while the action runs and closes it on success', async () => {
    const { result } = renderHook(() => usePendingDeviceAction());
    const action = deferred<string>();

    let run!: Promise<string>;
    act(() => {
      run = runDeviceAction(() => action.promise, OPTIONS);
    });
    expect(result.current).not.toBeNull();

    await act(async () => {
      action.resolve('ok');
      await expect(run).resolves.toBe('ok');
    });
    expect(result.current).toBeNull();
  });

  it('closes the dialog and forwards the error on failure', async () => {
    const { result } = renderHook(() => usePendingDeviceAction());
    const action = deferred<void>();

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => action.promise, OPTIONS);
    });

    await act(async () => {
      action.reject(new Error('device'));
      await expect(run).rejects.toThrow('device');
    });
    expect(result.current).toBeNull();
  });

  it('rejects with a cancel error and drops the late result', async () => {
    const { result } = renderHook(() => usePendingDeviceAction());
    const action = deferred<string>();

    let run!: Promise<string>;
    act(() => {
      run = runDeviceAction(() => action.promise, OPTIONS);
    });

    await act(async () => {
      result.current?.cancel();
      await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
    });
    expect(result.current).toBeNull();

    await act(async () => {
      action.resolve('late');
      await action.promise;
    });
    expect(result.current).toBeNull();
  });

  it('recognizes the cancel error', () => {
    expect(isDeviceActionCancelled(new DeviceActionCancelledError())).toBe(true);
    expect(isDeviceActionCancelled(new Error('x'))).toBe(false);
  });
});
