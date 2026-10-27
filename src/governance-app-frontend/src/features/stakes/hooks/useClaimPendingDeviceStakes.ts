import { Principal } from '@icp-sdk/core/principal';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { successNotification } from '@utils/notification';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { runOnDevice } from '@common/ledger/deviceQueue';

import { claimDeviceStake } from '../utils/claimDeviceStake';
import {
  clearPendingDeviceStake,
  type PendingDeviceStake,
  readAllPendingDeviceStakes,
} from '../utils/pendingDeviceStake';

type ClaimedDeviceStake = { principal: string; pending: PendingDeviceStake; neuronId: bigint };

// One pass at a time, shared by every mount.
let pass: Promise<ClaimedDeviceStake[]> | undefined;

/**
 * Claims the stake transfers that a Ledger device signed and that no wizard claimed yet.
 *
 * The claim is anonymous, so it needs no device and no balance. It waits in the queue of the
 * device, so a cancelled transfer that the device still signs lands before the claim reads the
 * sub-account. A record whose sub-account holds no neuron is forgotten. A failed claim stays
 * for the next pass.
 */
export const claimPendingDeviceStakes = (): Promise<ClaimedDeviceStake[]> =>
  (pass ??= (async () => {
    const claimed: ClaimedDeviceStake[] = [];
    const entries = Object.entries(readAllPendingDeviceStakes());
    if (entries.length === 0) return claimed;

    for (const [principal, pending] of entries) {
      try {
        const neuronId = await runOnDevice(principal, () =>
          claimDeviceStake({
            controller: Principal.fromText(principal),
            memo: BigInt(pending.memo),
          }),
        );
        clearPendingDeviceStake(principal);
        if (neuronId !== undefined) claimed.push({ principal, pending, neuronId });
      } catch (error: unknown) {
        console.warn('Failed to claim a pending Ledger device stake.', error);
      }
    }

    return claimed;
  })().finally(() => {
    pass = undefined;
  }));

/**
 * Runs one claim pass on mount and each time `enabled` turns true. A claimed neuron gets a
 * toast: it has no hotkey yet, so the user adds one from the device account.
 */
export const useClaimPendingDeviceStakes = (enabled = true): void => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    void claimPendingDeviceStakes().then((claimed) => {
      if (!active || claimed.length === 0) return;
      claimed.forEach(({ pending }) =>
        successNotification({
          title: t(($) => $.stakeWizardModal.ledgerDevice.recoveredTitle),
          description: t(($) => $.stakeWizardModal.ledgerDevice.recovered, {
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
