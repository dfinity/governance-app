import { isNullish, nonNullish } from '@dfinity/utils';

import type { AddressType } from '@declarations/governance-app-backend/backend.did';

import { addressToAccountIdentifier } from '@utils/address';

export const addressBookGetAddressString = (address: AddressType | undefined): string => {
  if (isNullish(address)) return '';
  if ('Icp' in address) return address.Icp;
  if ('Icrc1' in address) return address.Icrc1;
  return '';
};

export const addressBookIsIcpAddress = (address: AddressType): boolean => 'Icp' in address;

/**
 * The ICP account identifier of an entry, in the lowercase hex form the ICP
 * index reports. The index reports transfers to an ICRC-1 account by this
 * identifier, not by the ICRC-1 text. Returns undefined when the saved text
 * does not decode.
 */
export const addressBookGetAccountIdentifier = (address: AddressType): string | undefined =>
  addressToAccountIdentifier(addressBookGetAddressString(address));

/** The lookup keys of an entry: the saved text and its account identifier, when they differ. */
export const addressBookGetAddressKeys = (address: AddressType): Array<string> => {
  const text = addressBookGetAddressString(address);
  const accountIdentifier = addressBookGetAccountIdentifier(address);
  return nonNullish(accountIdentifier) && accountIdentifier !== text
    ? [text, accountIdentifier]
    : [text];
};

export const addressBookMatchesAddress = (address: AddressType, candidate: string): boolean =>
  addressBookGetAddressKeys(address).includes(candidate);
