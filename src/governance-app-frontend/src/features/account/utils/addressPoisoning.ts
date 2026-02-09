/**
 * Address poisoning detection utilities.
 *
 * Address poisoning is an attack where a malicious actor sends very small
 * transactions from an address that visually resembles one the user controls
 * or frequently transacts with (matching prefix and suffix). The goal is to
 * trick the user into copying the attacker's address from their transaction
 * history and accidentally sending funds to it.
 */

import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const PREFIX_MATCH_LENGTH = 4;
const SUFFIX_MATCH_LENGTH = 2;
const SMALL_AMOUNT_THRESHOLD_E8S = 100_000n;

const isAddressSimilar = (address: string, trustedAddress: string): boolean => {
  if (address === trustedAddress) return false;

  return (
    address.slice(0, PREFIX_MATCH_LENGTH) === trustedAddress.slice(0, PREFIX_MATCH_LENGTH) &&
    address.slice(-SUFFIX_MATCH_LENGTH) === trustedAddress.slice(-SUFFIX_MATCH_LENGTH)
  );
};

/**
 * Determines whether an incoming transaction looks like an address-poisoning
 * attempt.
 *
 * A transaction is flagged when **both** conditions hold:
 * 1. The transferred amount is very small (≤ 0.001 ICP).
 * 2. The sender address is visually similar (but not identical) to any address
 *    the user is known to control or have previously sent funds to.
 */
export const isSuspiciousAddress = (
  address: string,
  amountE8s: bigint,
  trustedAddresses: Set<string>,
): boolean => {
  if (amountE8s > SMALL_AMOUNT_THRESHOLD_E8S) return false;

  for (const trusted of trustedAddresses) {
    if (isAddressSimilar(address, trusted)) return true;
  }

  return false;
};

/**
 * Builds the set of "trusted" addresses from the user's transaction history.
 *
 * Trusted means any address the user owns or has intentionally interacted with:
 * - The user's own account identifier.
 * - Neuron sub-account identifiers (controlled by the user).
 * - Destination addresses from outgoing (SEND) transactions.
 */
export const buildTrustedAddresses = (
  userAccountId: string,
  neuronAccountIds: Set<string>,
  transactions: Array<IcpIndexDid.Transaction>,
): Set<string> => {
  const trusted = new Set<string>([userAccountId, ...neuronAccountIds]);

  for (const tx of transactions) {
    if (!('Transfer' in tx.operation)) continue;

    if (tx.operation.Transfer && tx.operation.Transfer.from === userAccountId) {
      trusted.add(tx.operation.Transfer.to);
    }
  }

  return trusted;
};
