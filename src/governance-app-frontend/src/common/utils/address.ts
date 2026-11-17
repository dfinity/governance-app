import { AccountIdentifier, checkAccountId, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isValidIcpAddress = (address: string | undefined): boolean => {
  if (isNullish(address)) return false;
  try {
    checkAccountId(address);
    return true;
  } catch {
    return false;
  }
};

export const isValidIcrcAddress = (address: string | undefined): boolean => {
  if (isNullish(address)) return false;
  try {
    decodeIcrcAccount(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * The ICP account identifier (lowercase hex) of an address. An ICRC-1 account
 * maps to the identifier the ICP ledger derives from its principal and
 * subaccount. Returns undefined when the address is neither form.
 */
export const addressToAccountIdentifier = (address: string): string | undefined => {
  if (isValidIcpAddress(address)) return AccountIdentifier.fromHex(address).toHex();
  try {
    const { owner, subaccount } = decodeIcrcAccount(address);
    const subAccount =
      nonNullish(subaccount) && subaccount.length === 32
        ? SubAccount.fromBytes(subaccount)
        : undefined;
    return AccountIdentifier.fromPrincipal({ principal: owner, subAccount }).toHex();
  } catch {
    return undefined;
  }
};
