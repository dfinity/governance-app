import { type ReactNode, useSyncExternalStore } from 'react';

import { isDeviceActionCancelled, runDeviceAction } from '@hooks/useDeviceAction';

import { getDeviceSessionGeneration, runOnDevice } from './deviceQueue';
import { isLedgerDeviceError, LedgerDeviceError, LedgerErrorCode } from './errors';

export type ApprovedDeviceCallOptions = {
  /** What the user checks on the device screen. Shown in the approval dialog. */
  description: ReactNode;
  /** The values to compare with the device screen, for example an amount or a principal. */
  detail?: ReactNode;
};

/**
 * The approval in progress, across every device. The transport serves one request at a
 * time, so a dialog must not open while a request to any device is outstanding.
 */
let approvals: Promise<unknown> = Promise.resolve();
// The session of the chain. A logout leaves a request without an answer behind, so the next
// session starts a new chain instead of a wait for it.
let approvalsGeneration = getDeviceSessionGeneration();

// The cancelled requests that still wait for the device answer. The processing screens
// tell the user that the device must answer before the flow goes on. A request of a closed
// session does not count: its answer belongs to that session.
let unanswered = new Set<{ generation: number }>();
let listeners: Array<() => void> = [];

const emit = () => listeners.forEach((listener) => listener());

/**
 * Forgets the approval in progress, so the next call does not wait for it, and the requests
 * that wait for the device answer. `clearLedgerIdentities` calls it on logout.
 */
export const clearDeviceApprovals = (): void => {
  approvals = Promise.resolve();
  approvalsGeneration = getDeviceSessionGeneration();
  unanswered = new Set();
  emit();
};

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

const isAnswerPending = () =>
  unanswered.values().some(({ generation }) => generation === getDeviceSessionGeneration());

/** Whether a cancelled request still waits for the answer of the device. */
export const useDeviceAnswerPending = (): boolean =>
  useSyncExternalStore(subscribe, isAnswerPending);

const approvalsOfThisSession = (): Promise<unknown> => {
  if (approvalsGeneration !== getDeviceSessionGeneration()) clearDeviceApprovals();
  return approvals;
};

/**
 * Runs one call that a Ledger device signs, behind the "Approve on your Ledger device" dialog.
 *
 * The call waits for the pending calls to the same device and for the approval in progress
 * on any device. The dialog opens when its turn starts, after a check that the session is
 * still the one that queued the call, so it never shows the values of a request that the
 * device does not show yet, and a logout does not leak a request into the next session.
 *
 * `call` connects to the device and signs. It checks `signal.aborted` after every await
 * that precedes the signature and throws `DeviceActionCancelledError` when it is set, so a
 * cancel during the connection never asks for a signature. A cancel on the dialog rejects
 * with `DeviceActionCancelledError` when the device does not sign. The turn still waits
 * for the device to answer, so the caller stays pending and no second request starts.
 * When the device signs after the cancel, the call resolves with its result as if approved,
 * so the caller reports what happened. When the call fails after the signature, for example
 * in the canister, it rejects with that error, not with the cancel. A result that arrives
 * after a logout rejects with `SessionClosed`, so a flow of the closed session does not go
 * on in the next one.
 */
export const runApprovedDeviceCall = <T>(
  principal: string,
  call: (signal: AbortSignal) => Promise<T>,
  options: ApprovedDeviceCallOptions,
): Promise<T> => {
  const approve = async (): Promise<T> => {
    let signing: Promise<T> | undefined;
    const start = (signal: AbortSignal) => (signing = call(signal));

    try {
      return await runDeviceAction(start, options);
    } catch (error) {
      // The dialog is closed, but the device may still sign the request.
      if (!isDeviceActionCancelled(error) || !signing) throw error;
      const request = { generation: getDeviceSessionGeneration() };
      unanswered.add(request);
      emit();
      const late = await signing
        .then(
          (value) => ({ signed: true as const, value }),
          (reason: unknown) => ({ signed: false as const, reason }),
        )
        .finally(() => {
          unanswered.delete(request);
          emit();
        });
      if (late.signed) return late.value;
      // The device module reports every failure before the signature as a device error. Any
      // other failure came after the signature, so the cancel is not the outcome.
      if (isLedgerDeviceError(late.reason) || isDeviceActionCancelled(late.reason)) throw error;
      throw late.reason;
    }
  };

  return runOnDevice(principal, () => {
    // The queue checked the session before this turn. The wait for the approval in progress
    // can span a logout, so the check runs again before the dialog opens.
    const generation = getDeviceSessionGeneration();
    const sessionClosed = () => generation !== getDeviceSessionGeneration();
    const turn = approvalsOfThisSession().then(async () => {
      if (sessionClosed()) throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
      const result = await approve();
      // The device can answer after a logout. The result belongs to the closed session: the
      // caller must not go on with its next step in the next one.
      if (sessionClosed()) throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
      return result;
    });
    approvals = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  });
};
