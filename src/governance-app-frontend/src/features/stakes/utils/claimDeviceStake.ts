import { UnrecognizedTypeError } from '@icp-sdk/canisters/nns';
import type { Principal } from '@icp-sdk/core/principal';

import { getAnonymousNnsGovernanceCanister } from '@common/canisters';

// `GovernanceError.error_type` of an empty stake sub-account (`ErrorType::InsufficientFunds`
// in the governance canister).
const INSUFFICIENT_FUNDS_ERROR_TYPE = 10;

// The SDK reports a governance error answer as `UnrecognizedTypeError` with the response
// JSON in the message.
const isInsufficientFunds = (error: unknown): boolean =>
  error instanceof UnrecognizedTypeError &&
  new RegExp(`"error_type":\\s*${INSUFFICIENT_FUNDS_ERROR_TYPE}\\b`).test(error.message);

/**
 * Claims the neuron of a stake sub-account with the anonymous governance canister. A Ledger
 * device cannot sign `claim_or_refresh`, and the claim needs no signer.
 *
 * Returns `undefined` when the sub-account holds no stake. Every other failure throws, a
 * governance error included: the sub-account may still hold the ICP.
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
    if (isInsufficientFunds(error)) return undefined;
    throw error;
  }
};
