import type { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { memoToNeuronAccountIdentifier } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { errorMessage } from '@utils/error';

/**
 * A random 64-bit memo for a stake transfer. The controller and the memo derive the
 * governance sub-account that holds the stake, so a claim with the same memo finds it.
 */
export const createStakeMemo = (): bigint => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));

  return new DataView(bytes.buffer).getBigUint64(0);
};

/** The governance account that a stake transfer pays into. Same derivation as `stakeNeuron`. */
export const getStakeAccountIdentifier = ({
  controller,
  memo,
}: {
  controller: Principal;
  memo: bigint;
}): AccountIdentifier => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw errorMessage('getStakeAccountIdentifier', 'the canister Id is not defined');
  }

  return memoToNeuronAccountIdentifier({
    controller,
    memo,
    governanceCanisterId: Principal.fromText(CANISTER_ID_NNS_GOVERNANCE),
  });
};

export enum DeviceApprovalStep {
  Transfer = 'transfer',
  Hotkey = 'hotkey',
  DissolveDelay = 'dissolveDelay',
  AutoStake = 'autoStake',
  StartDissolving = 'startDissolving',
}

/**
 * The approvals that a stake from a Ledger device account asks on the device, in order.
 * The transfer, the hotkey, and the dissolve delay are always there. Auto-stake and
 * dissolving only when the user selected them. Following signs with the hotkey, not the device.
 */
export const getDeviceApprovalSteps = ({
  autoStakeMaturity,
  startDissolving,
}: {
  autoStakeMaturity: boolean;
  startDissolving: boolean;
}): DeviceApprovalStep[] => [
  DeviceApprovalStep.Transfer,
  DeviceApprovalStep.Hotkey,
  DeviceApprovalStep.DissolveDelay,
  ...(autoStakeMaturity ? [DeviceApprovalStep.AutoStake] : []),
  ...(startDissolving ? [DeviceApprovalStep.StartDissolving] : []),
];
