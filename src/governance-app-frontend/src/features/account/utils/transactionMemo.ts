import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { fromNullable, nonNullish } from '@dfinity/utils';

import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

import { TransactionType } from '../types';

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

export type TransactionMemoDisplay = {
  kind: 'text' | 'numeric';
  value: string;
};

// Most non-zero memos on the ledger are protocol bookkeeping rather than a note
// meant for a reader: staking derives the neuron subaccount from `memo`, and
// mints and burns carry routing data from the CMC and the ckBTC minter. Only
// transfer-shaped transactions can carry a memo a person wrote.
const MEMO_DISPLAY_TYPES: ReadonlySet<TransactionType> = new Set([
  TransactionType.SEND,
  TransactionType.RECEIVE,
  TransactionType.SELF,
]);

// A memo on an incoming transaction is text chosen by the counterparty and
// rendered next to a real balance change, so it is treated as hostile input.
const isUnsafeMemoCodePoint = (codePoint: number): boolean =>
  codePoint <= 0x1f || // C0 controls
  (codePoint >= 0x7f && codePoint <= 0x9f) || // DEL and C1 controls
  codePoint === 0x200e || // left-to-right mark
  codePoint === 0x200f || // right-to-left mark
  (codePoint >= 0x202a && codePoint <= 0x202e) || // bidi embeddings and overrides
  (codePoint >= 0x2066 && codePoint <= 0x2069); // bidi isolates

// Characters that could reorder or hide part of the surrounding row are dropped
// rather than escaped: a memo is short, and losing a character is preferable to
// rendering one that lies about what the row says.
const sanitizeMemoText = (text: string): string =>
  [...text]
    .filter((char) => !isUnsafeMemoCodePoint(char.codePointAt(0)!))
    .join('')
    .trim();

const decodeIcrc1MemoText = (bytes: Uint8Array): string | undefined => {
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Not UTF-8. ICRC-2 and ckBTC flows put binary payloads (often CBOR) in
    // this field, which mean nothing to a reader, so nothing is rendered.
    return undefined;
  }

  const sanitized = sanitizeMemoText(decoded);
  return sanitized === '' ? undefined : sanitized;
};

/**
 * Picks the memo to display for a transaction, preferring the ICRC-1 blob over
 * the legacy numeric field. Returns `undefined` when the transaction carries no
 * memo, when its memo is protocol bookkeeping, or when the blob is not readable
 * text.
 */
export const formatTransactionMemo = ({
  transaction,
  type,
}: {
  transaction: IcpIndexDid.Transaction;
  type: TransactionType;
}): TransactionMemoDisplay | undefined => {
  if (!MEMO_DISPLAY_TYPES.has(type)) return undefined;

  const icrc1Memo = fromNullable(transaction.icrc1_memo);
  if (nonNullish(icrc1Memo) && icrc1Memo.length > 0) {
    const text = decodeIcrc1MemoText(icrc1Memo);
    return nonNullish(text) ? { kind: 'text', value: text } : undefined;
  }

  // The ledger reports an unset numeric memo as 0, which is indistinguishable
  // from a memo explicitly sent as 0, so 0 is treated as absent.
  if (transaction.memo === 0n) return undefined;

  return { kind: 'numeric', value: transaction.memo.toString() };
};
