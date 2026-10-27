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
import { getDeviceSessionGeneration, runOnDevice } from '@common/ledger/deviceQueue';
import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

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
// The session of the chain. A logout leaves a request without an answer behind, so the next
// session starts a new chain instead of a wait for it.
let approvalsGeneration = getDeviceSessionGeneration();

/** Forgets the approval in progress, so the next call does not wait for it. For tests. */
export const clearLedgerApprovals = (): void => {
  approvals = Promise.resolve();
  approvalsGeneration = getDeviceSessionGeneration();
};

const approvalsOfThisSession = (): Promise<unknown> => {
  if (approvalsGeneration !== getDeviceSessionGeneration()) clearLedgerApprovals();
  return approvals;
};

/**
 * Runs one governance call that a Ledger device signs.
 *
 * The call waits for the pending calls to the same device and for the approval in progress
 * on any device. The "Approve on your Ledger device" dialog opens when its turn starts, so
 * it never shows the values of a request that the device does not show yet. A cancel on the dialog rejects with
 * `DeviceActionCancelledError` when the device does not sign. The turn still waits for the
 * device to answer, so the caller stays pending and no second request starts. When the
 * device signs after the cancel, the call resolves with its result as if approved, so the
 * caller reports what happened. One analytics event reports the outcome.
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
        const late =
          isDeviceActionCancelled(error) && signing
            ? await signing.then(
                (value) => ({ signed: true as const, value }),
                () => ({ signed: false as const }),
              )
            : { signed: false as const };
        if (late.signed) {
          analytics.event(AnalyticsEvent.LedgerDeviceAction, { action });
          return late.value;
        }
        analytics.event(AnalyticsEvent.LedgerDeviceActionError, {
          action,
          reason: getErrorReason(error),
        });
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
};
