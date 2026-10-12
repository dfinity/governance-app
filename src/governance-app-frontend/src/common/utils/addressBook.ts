import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

import type { AddressType } from '@declarations/governance-app-backend/governance-app-backend.did';

export const addressBookGetAddressString = (address: AddressType | undefined): string => {
  if (isNullish(address)) return '';
  if ('Icp' in address) return address.Icp;
  if ('Icrc1' in address) return address.Icrc1;
  return '';
};

export const addressBookIsIcpAddress = (address: AddressType): boolean => 'Icp' in address;

/**
 * The ICP account identifier (hex) of an entry. The ICP ledger and index report
 * transfers to an ICRC-1 account by this identifier, not by the ICRC-1 text.
 * Returns undefined when the ICRC-1 text does not decode.
 */
export const addressBookGetAccountIdentifier = (address: AddressType): string | undefined => {
  if ('Icp' in address) return address.Icp;
  try {
    const { owner, subaccount } = decodeIcrcAccount(address.Icrc1);
    const subAccount =
      nonNullish(subaccount) && subaccount.length === 32
        ? SubAccount.fromBytes(subaccount)
        : undefined;
    return AccountIdentifier.fromPrincipal({ principal: owner, subAccount }).toHex();
  } catch {
    return undefined;
  }
};

/** The lookup keys of an entry: the saved text and, for an ICRC-1 entry, the account identifier. */
export const addressBookGetAddressKeys = (address: AddressType): Array<string> => {
  const text = addressBookGetAddressString(address);
  const accountIdentifier = addressBookGetAccountIdentifier(address);
  return nonNullish(accountIdentifier) && accountIdentifier !== text
    ? [text, accountIdentifier]
    : [text];
};

export const addressBookMatchesAddress = (address: AddressType, candidate: string): boolean =>
  addressBookGetAddressKeys(address).includes(candidate);
