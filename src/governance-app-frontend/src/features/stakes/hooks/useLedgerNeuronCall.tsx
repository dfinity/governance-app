import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import type { ReactNode } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import {
  DeviceActionCancelledError,
  isDeviceActionCancelled,
  useDeviceAction,
} from '@hooks/useDeviceAction';
import { getNnsGovernanceCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';

/** The `action` property of the `ledger_device_action` analytics events. */
export type LedgerNeuronAction =
  | 'increase_delay'
  | 'start_dissolving'
  | 'stop_dissolving'
  | 'set_maturity_mode'
  | 'stake_maturity'
  | 'disburse'
  | 'disburse_maturity'
  | 'vote';

export type LedgerNeuronCallOptions = {
  /** The principal of the registered device that controls the neuron. */
  principal: string;
  /** The name of the action in analytics. */
  action: LedgerNeuronAction;
  /** What the user checks on the device screen. Shown in the approval dialog. */
  description: ReactNode;
  /** The values to compare with the device screen. */
  detail?: ReactNode;
};

/**
 * The approval in progress, across every device. The transport serves one request at a
 * time, so a dialog must not open while a request to any device is outstanding.
 */
let approvals: Promise<unknown> = Promise.resolve();

/** Forgets the approval in progress, so the next call does not wait for it. For tests. */
export const clearLedgerApprovals = (): void => {
  approvals = Promise.resolve();
};

/**
 * Runs one governance call that a Ledger device signs.
 *
 * The call waits for the pending calls to the same device and for the approval in progress
 * on any device. The "Approve on your Ledger device" dialog opens when its turn starts, so
 * it never shows the values of a request that the device does not show yet. A cancel on the dialog rejects with
 * `DeviceActionCancelledError`; the turn still waits for the device to answer, so the
 * caller stays pending, no second request starts, and a late approval runs the whole call
 * (`call` must include the refresh that follows the governance update). One analytics
 * event reports the outcome.
 */
export const useLedgerNeuronCall = () => {
  const runDeviceAction = useDeviceAction();

  return <T,>(
    call: (canister: NnsGovernanceCanister) => Promise<T>,
    { principal, action, description, detail }: LedgerNeuronCallOptions,
  ): Promise<T> => {
    const approve = async (): Promise<T> => {
      let signing: Promise<T> | undefined;
      const start = (signal: AbortSignal) => {
        signing = (async () => {
          const canister = await getNnsGovernanceCanister({
            signer: { kind: 'ledger', principal },
          });
          // A cancel during the connection must not start a signing request.
          if (signal.aborted) throw new DeviceActionCancelledError();
          return call(canister);
        })();
        return signing;
      };

      try {
        const result = await runDeviceAction(start, { description, detail });
        analytics.event(AnalyticsEvent.LedgerDeviceAction, { action });
        return result;
      } catch (error) {
        // The dialog is closed, but the device may still sign the request.
        const signedLate =
          isDeviceActionCancelled(error) && signing
            ? await signing.then(
                () => true,
                () => false,
              )
            : false;
        if (signedLate) {
          analytics.event(AnalyticsEvent.LedgerDeviceAction, { action });
        } else {
          analytics.event(AnalyticsEvent.LedgerDeviceActionError, {
            action,
            reason: getErrorReason(error),
          });
        }
        throw error;
      }
    };

    return runOnDevice(principal, () => {
      const turn = approvals.then(approve);
      approvals = turn.then(
        () => undefined,
        () => undefined,
      );
      return turn;
    });
  };
};
