import { checkAccountId } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { isNullish } from '@dfinity/utils';

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
