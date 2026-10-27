import { Principal } from '@icp-sdk/core/principal';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { successNotification } from '@utils/notification';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { getAnonymousNnsGovernanceCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';

import { claimDeviceStake } from '../utils/claimDeviceStake';
import {
  clearPendingDeviceStake,
  type PendingDeviceStake,
  readAllPendingDeviceStakes,
} from '../utils/pendingDeviceStake';
import {
  clearPendingDeviceTopUp,
  type PendingDeviceTopUp,
  readAllPendingDeviceTopUps,
} from '../utils/pendingDeviceTopUp';

export type RecoveredDeviceStakes = {
  /** The stakes claimed in this pass. The neuron has no hotkey yet. */
  claimed: Array<{ principal: string; pending: PendingDeviceStake; neuronId: bigint }>;
  /** The top-ups refreshed in this pass. */
  refreshed: PendingDeviceTopUp[];
};

// One pass at a time, shared by every mount.
let pass: Promise<RecoveredDeviceStakes> | undefined;

/**
 * Claims the stake transfers that a Ledger device signed and that no wizard claimed yet, and
 * refreshes the neurons of the top-up transfers that no view refreshed yet.
 *
 * Both calls are anonymous, so they need no device and no balance. A claim waits in the
 * queue of its device, so a cancelled transfer that the device still signs lands before the
 * claim reads the sub-account. A stake record whose sub-account holds no ICP is forgotten. A
 * failed call keeps its record for the next pass.
 */
export const claimPendingDeviceStakes = (): Promise<RecoveredDeviceStakes> =>
  (pass ??= (async () => {
    const result: RecoveredDeviceStakes = { claimed: [], refreshed: [] };

    for (const [principal, pending] of Object.entries(readAllPendingDeviceStakes())) {
      try {
        const neuronId = await runOnDevice(principal, () =>
          claimDeviceStake({
            controller: Principal.fromText(principal),
            memo: BigInt(pending.memo),
          }),
        );
        clearPendingDeviceStake(principal, pending.memo);
        if (neuronId !== undefined) result.claimed.push({ principal, pending, neuronId });
      } catch (error: unknown) {
        console.warn('Failed to claim a pending Ledger device stake.', error);
      }
    }

    for (const [key, pending] of Object.entries(readAllPendingDeviceTopUps())) {
      try {
        const governance = await getAnonymousNnsGovernanceCanister();
        await governance.claimOrRefreshNeuron({
          neuronId: BigInt(pending.neuronId),
          by: { NeuronIdOrSubaccount: {} },
        });
        clearPendingDeviceTopUp(key);
        result.refreshed.push(pending);
      } catch (error: unknown) {
        console.warn('Failed to refresh a pending Ledger device top-up.', error);
      }
    }

    return result;
  })().finally(() => {
    pass = undefined;
  }));

/**
 * Runs one recovery pass on mount and each time `enabled` turns true. A claimed neuron gets a
 * toast: it has no hotkey yet, so the user adds one from the device account. A refreshed
 * top-up gets a toast too.
 */
export const useClaimPendingDeviceStakes = (enabled = true): void => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    void claimPendingDeviceStakes().then(({ claimed, refreshed }) => {
      if (!active || (claimed.length === 0 && refreshed.length === 0)) return;
      claimed.forEach(({ pending }) =>
        successNotification({
          title: t(($) => $.stakeWizardModal.ledgerDevice.recoveredTitle),
          description: t(($) => $.stakeWizardModal.ledgerDevice.recovered, {
            amount: pending.amount,
          }),
        }),
      );
      refreshed.forEach((pending) =>
        successNotification({
          title: t(($) => $.neuronDetailModal.increaseStake.ledgerDevice.recoveredTitle),
          description: t(($) => $.neuronDetailModal.increaseStake.ledgerDevice.recovered, {
            amount: pending.amount,
          }),
        }),
      );
      queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] })
        .catch(failedRefresh);
    });

    return () => {
      active = false;
    };
  }, [enabled, queryClient, t]);
};
