import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

// The ICP ledger exposes two unrelated memo fields depending on which transfer
// interface is used:
// - the legacy `transfer` takes a numeric `memo` (u64)
// - the ICRC-1 `icrc1Transfer` takes an `icrc1Memo` blob (up to 32 bytes)
// A single user-facing memo string is encoded to whichever field matches the
// destination address type.

const UINT64_MAX = 2n ** 64n - 1n;
const ICRC1_MEMO_MAX_BYTES = 32;

export type MemoValidationError = 'ICP_MEMO_ERROR' | 'ICRC_MEMO_ERROR';

export const encodeMemoToIcp = (memo: string): bigint => BigInt(memo);

/** ICP memos must be a non-negative integer that fits in a u64. */
export const isValidIcpMemo = (memo: string): boolean => {
  try {
    const value = encodeMemoToIcp(memo);
    return value >= 0n && value <= UINT64_MAX;
  } catch {
    return false;
  }
};

export const encodeMemoToIcrc1 = (memo: string): Uint8Array => new TextEncoder().encode(memo);

/** ICRC-1 memos must be at most 32 bytes when encoded as UTF-8. */
export const isValidIcrc1Memo = (memo: string): boolean => {
  try {
    return encodeMemoToIcrc1(memo).length <= ICRC1_MEMO_MAX_BYTES;
  } catch {
    return false;
  }
};

/**
 * Validates a memo against the destination address type. Returns `undefined`
 * when the memo is empty (memos are optional) or valid for the destination.
 */
export const validateTransactionMemo = ({
  memo,
  destinationAddress,
}: {
  memo: string | undefined;
  destinationAddress: string;
}): MemoValidationError | undefined => {
  if (memo === undefined || memo === '') return undefined;

  if (isValidIcpAddress(destinationAddress) && !isValidIcpMemo(memo)) {
    return 'ICP_MEMO_ERROR';
  }

  if (isValidIcrcAddress(destinationAddress) && !isValidIcrc1Memo(memo)) {
    return 'ICRC_MEMO_ERROR';
  }

  return undefined;
};
