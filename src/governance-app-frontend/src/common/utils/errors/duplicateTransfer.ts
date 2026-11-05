import { TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import { IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';

type IcrcDuplicate = { Duplicate: { duplicate_of: bigint } };

const isIcrcDuplicate = (errorType: unknown): errorType is IcrcDuplicate =>
  typeof errorType === 'object' && errorType !== null && 'Duplicate' in errorType;

/**
 * The block index of the transfer that the ledger already holds, when the error says the
 * transfer is a duplicate (same `createdAt`, memo, amount, source and destination).
 * Undefined for every other error.
 */
export const duplicateTransferOf = (error: unknown): bigint | undefined => {
  if (error instanceof TxDuplicateError) return error.duplicateOf;
  if (error instanceof IcrcTransferError && isIcrcDuplicate(error.errorType)) {
    return error.errorType.Duplicate.duplicate_of;
  }

  return undefined;
};
