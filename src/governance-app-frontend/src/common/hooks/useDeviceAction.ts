import { useSyncExternalStore } from 'react';

/** Thrown to the caller of `runDeviceAction` when the user cancels the approval dialog. */
export class DeviceActionCancelledError extends Error {
  constructor() {
    super('The device action was cancelled.');
    this.name = 'DeviceActionCancelledError';
  }
}

export const isDeviceActionCancelled = (error: unknown): error is DeviceActionCancelledError =>
  error instanceof DeviceActionCancelledError;

type PendingDeviceAction = {
  id: number;
  cancel: () => void;
};

/**
 * The device action in progress, read by `DeviceApprovalDialog`.
 * One action runs at a time: the device accepts one transport, and each action is a
 * manual approval on the device.
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
 * Runs a device action behind the approval dialog.
 *
 * The dialog opens before the action starts and closes when the action settles. A cancel
 * from the dialog rejects the returned promise with `DeviceActionCancelledError`; the
 * device call itself cannot be aborted, so its late result is dropped.
 */
export const runDeviceAction = <T>(action: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = ++nextId;

    const settle = () => {
      if (pending?.id !== id) return;
      pending = null;
      emit();
    };

    pending = {
      id,
      cancel: () => {
        settle();
        reject(new DeviceActionCancelledError());
      },
    };
    emit();

    action().then(
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

/** Wraps a promise in the "Approve on your Ledger device" dialog. */
export const useDeviceAction = () => runDeviceAction;

/** The device action in progress, or `null`. For the approval dialog. */
export const usePendingDeviceAction = () => useSyncExternalStore(subscribe, getPending);
