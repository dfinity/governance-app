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
 * Runs one governance call that a Ledger device signs.
 *
 * The call waits for the pending calls to the same device, then runs behind the "Approve on
 * your Ledger device" dialog. A cancel on the dialog rejects with `DeviceActionCancelledError`.
 * When the device already shows the request, the rejection waits for the call to settle: the
 * caller stays pending, so no second request starts, and a late approval still runs the whole
 * call (`call` must include the refresh that follows the governance update). One analytics
 * event reports the outcome.
 */
export const useLedgerNeuronCall = () => {
  const runDeviceAction = useDeviceAction();

  return async <T,>(
    call: (canister: NnsGovernanceCanister) => Promise<T>,
    { principal, action, description, detail }: LedgerNeuronCallOptions,
  ): Promise<T> => {
    let queued: Promise<T> | undefined;
    const start = (signal: AbortSignal) => {
      queued = runOnDevice(principal, async () => {
        // A cancelled call that waited in the queue must not prompt the device.
        if (signal.aborted) throw new DeviceActionCancelledError();
        const canister = await getNnsGovernanceCanister({
          signer: { kind: 'ledger', principal },
        });
        // A cancel during the connection must not start a signing request.
        if (signal.aborted) throw new DeviceActionCancelledError();
        return call(canister);
      });
      return queued;
    };

    try {
      const result = await runDeviceAction(start, { description, detail });
      analytics.event(AnalyticsEvent.LedgerDeviceAction, { action });
      return result;
    } catch (error) {
      // The dialog is closed, but the device may still sign the request.
      const signedLate =
        isDeviceActionCancelled(error) && queued
          ? await queued.then(
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
};
