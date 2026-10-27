import { UnrecognizedTypeError } from '@icp-sdk/canisters/nns';
import type { Principal } from '@icp-sdk/core/principal';

import { getAnonymousNnsGovernanceCanister } from '@common/canisters';

/**
 * Claims the neuron of a stake sub-account with the anonymous governance canister. A Ledger
 * device cannot sign `claim_or_refresh`, and the claim needs no signer.
 *
 * Returns `undefined` when the canister answered without a neuron, for example an error for a
 * sub-account that holds no ICP. A failed call (network, canister down) throws.
 */
export const claimDeviceStake = async ({
  controller,
  memo,
}: {
  controller: Principal;
  memo: bigint;
}): Promise<bigint | undefined> => {
  const governance = await getAnonymousNnsGovernanceCanister();

  try {
    return await governance.claimOrRefreshNeuronFromAccount({ controller, memo });
  } catch (error: unknown) {
    // The canister answered with a governance error instead of a neuron id.
    if (error instanceof UnrecognizedTypeError) return undefined;
    throw error;
  }
};
