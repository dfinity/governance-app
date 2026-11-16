import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import type { ReactNode } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { DeviceActionCancelledError } from '@hooks/useDeviceAction';
import { getNnsGovernanceCanister } from '@common/canisters';
import { runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';

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
 * The call runs through `runApprovedDeviceCall`: in the queue of the device, behind the
 * approval dialog that opens at its turn, and pending after a cancel until the device
 * answers. One analytics event reports the outcome.
 */
export const useLedgerNeuronCall =
  () =>
  <T,>(
    call: (canister: NnsGovernanceCanister) => Promise<T>,
    { principal, action, description, detail }: LedgerNeuronCallOptions,
  ): Promise<T> =>
    runApprovedDeviceCall(
      principal,
      async (signal) => {
        const canister = await getNnsGovernanceCanister({ signer: { kind: 'ledger', principal } });
        // A cancel during the connection must not start a signing request.
        if (signal.aborted) throw new DeviceActionCancelledError();
        return call(canister);
      },
      { description, detail },
    ).then(
      (result) => {
        analytics.event(AnalyticsEvent.LedgerDeviceAction, { action });
        return result;
      },
      (error: unknown) => {
        analytics.event(AnalyticsEvent.LedgerDeviceActionError, {
          action,
          reason: getErrorReason(error),
        });
        throw error;
      },
    );
