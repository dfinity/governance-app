import { type ReactNode, useSyncExternalStore } from 'react';

/** Thrown to the caller of `runDeviceAction` when the user cancels the approval dialog. */
export class DeviceActionCancelledError extends Error {
  constructor() {
    super('The device action was cancelled.');
    this.name = 'DeviceActionCancelledError';
  }
}

export const isDeviceActionCancelled = (error: unknown): error is DeviceActionCancelledError =>
  error instanceof DeviceActionCancelledError;

type DeviceActionOptions = {
  /** What the user checks on the device screen. Shown in the approval dialog. */
  description: ReactNode;
  /** The values to compare with the device screen, for example a principal. */
  detail?: ReactNode;
};

type PendingDeviceAction = DeviceActionOptions & {
  id: number;
  cancel: () => void;
};

/**
 * The device action in progress, read by `PendingDeviceActionDialog`.
 * One action shows at a time: each one is a manual approval on the device screen. A new
 * action cancels the previous wrapper, so no caller loses its cancel handle.
 */
let pending: PendingDeviceAction | null = null;
let nextId = 0;
let listeners: Array<() => void> = [];

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

const getPending = () => pending;

/**
 * Runs a device action behind the "Approve on your Ledger device" dialog.
 *
 * The dialog opens before the action starts and closes when the action settles. A cancel
 * from the dialog rejects the returned promise with `DeviceActionCancelledError` and
 * aborts `signal`; the device call itself cannot be aborted, so its late result is
 * dropped. Wrap the call in `runOnDevice` so the calls to one device stay in order, and
 * check `signal.aborted` before the device access so a cancelled call that waits in the
 * queue does not prompt the device.
 */
export const runDeviceAction = <T>(
  action: (signal: AbortSignal) => Promise<T>,
  { description, detail }: DeviceActionOptions,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = ++nextId;
    const controller = new AbortController();

    const settle = () => {
      if (pending?.id !== id) return;
      pending = null;
      emit();
    };

    // The dialog can show one action. The previous caller is told that its wait ended.
    pending?.cancel();

    pending = {
      id,
      description,
      detail,
      cancel: () => {
        settle();
        controller.abort();
        reject(new DeviceActionCancelledError());
      },
    };
    emit();

    let result: Promise<T>;
    try {
      result = action(controller.signal);
    } catch (error: unknown) {
      settle();
      reject(error);
      return;
    }

    result.then(
      (value) => {
        settle();
        resolve(value);
      },
      (error: unknown) => {
        settle();
        reject(error);
      },
    );
  });

/** Cancels the device action in progress, if any. The dialog calls it when it unmounts. */
export const cancelPendingDeviceAction = (): void => {
  pending?.cancel();
};

/** Wraps a promise in the "Approve on your Ledger device" dialog. */
export const useDeviceAction = () => runDeviceAction;

/** The device action in progress, or `null`. For the approval dialog. */
export const usePendingDeviceAction = () => useSyncExternalStore(subscribe, getPending);
