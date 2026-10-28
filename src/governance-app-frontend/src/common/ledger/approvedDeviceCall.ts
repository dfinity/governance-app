import type { ReactNode } from 'react';

import { isDeviceActionCancelled, runDeviceAction } from '@hooks/useDeviceAction';

import { getDeviceSessionGeneration, runOnDevice } from './deviceQueue';
import { LedgerDeviceError, LedgerErrorCode } from './errors';

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

/** Forgets the approval in progress, so the next call does not wait for it. For tests. */
export const clearDeviceApprovals = (): void => {
  approvals = Promise.resolve();
  approvalsGeneration = getDeviceSessionGeneration();
};

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
 * so the caller reports what happened.
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
      const late = await signing.then(
        (value) => ({ signed: true as const, value }),
        () => ({ signed: false as const }),
      );
      if (late.signed) return late.value;
      throw error;
    }
  };

  return runOnDevice(principal, () => {
    // The queue checked the session before this turn. The wait for the approval in progress
    // can span a logout, so the check runs again before the dialog opens.
    const generation = getDeviceSessionGeneration();
    const turn = approvalsOfThisSession().then(() => {
      if (generation !== getDeviceSessionGeneration()) {
        throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
      }
      return approve();
    });
    approvals = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  });
};
