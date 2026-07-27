import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { describe, expect, it } from 'vitest';

import { TransactionType } from '../types';
import {
  encodeMemoToIcp,
  encodeMemoToIcrc1,
  formatTransactionMemo,
  isValidIcpMemo,
  isValidIcrc1Memo,
  validateTransactionMemo,
} from './transactionMemo';

// Valid ICP account identifier (checksum-correct) derived from ICRC_ADDRESS's principal.
const ICP_ADDRESS = '051b05839339f89053454a4b9865ea0452a4bffe2b1cd41f4982bad10c1e637c';
// Valid ICRC-1 textual account (a principal).
const ICRC_ADDRESS = 'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae';

describe('encodeMemoToIcp', () => {
  it('parses a numeric string to bigint', () => {
    expect(encodeMemoToIcp('12345')).toBe(12345n);
  });
});

describe('isValidIcpMemo', () => {
  it('accepts non-negative integers within u64 range', () => {
    expect(isValidIcpMemo('0')).toBe(true);
    expect(isValidIcpMemo('12345')).toBe(true);
    expect(isValidIcpMemo((2n ** 64n - 1n).toString())).toBe(true);
  });

  it('rejects values beyond u64', () => {
    expect(isValidIcpMemo((2n ** 64n).toString())).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(isValidIcpMemo('-1')).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(isValidIcpMemo('abc')).toBe(false);
    expect(isValidIcpMemo('12.5')).toBe(false);
  });
});

describe('encodeMemoToIcrc1', () => {
  it('encodes a string to UTF-8 bytes', () => {
    expect(encodeMemoToIcrc1('hi')).toEqual(new TextEncoder().encode('hi'));
  });
});

describe('isValidIcrc1Memo', () => {
  it('accepts memos up to 32 bytes', () => {
    expect(isValidIcrc1Memo('hello')).toBe(true);
    expect(isValidIcrc1Memo('a'.repeat(32))).toBe(true);
  });

  it('rejects memos longer than 32 bytes', () => {
    expect(isValidIcrc1Memo('a'.repeat(33))).toBe(false);
  });

  it('counts UTF-8 byte length, not character length', () => {
    // Each emoji is 4 bytes; 9 of them = 36 bytes > 32.
    expect(isValidIcrc1Memo('😀'.repeat(9))).toBe(false);
  });
});

describe('validateTransactionMemo', () => {
  it('returns undefined for an empty or missing memo', () => {
    expect(validateTransactionMemo({ memo: '', destinationAddress: ICP_ADDRESS })).toBeUndefined();
    expect(
      validateTransactionMemo({ memo: undefined, destinationAddress: ICP_ADDRESS }),
    ).toBeUndefined();
  });

  it('validates numeric memos against ICP addresses', () => {
    expect(
      validateTransactionMemo({ memo: '42', destinationAddress: ICP_ADDRESS }),
    ).toBeUndefined();
    expect(validateTransactionMemo({ memo: 'abc', destinationAddress: ICP_ADDRESS })).toBe(
      'ICP_MEMO_ERROR',
    );
  });

  it('validates byte-length memos against ICRC-1 addresses', () => {
    expect(
      validateTransactionMemo({ memo: 'note', destinationAddress: ICRC_ADDRESS }),
    ).toBeUndefined();
    expect(
      validateTransactionMemo({ memo: 'a'.repeat(33), destinationAddress: ICRC_ADDRESS }),
    ).toBe('ICRC_MEMO_ERROR');
  });
});

describe('formatTransactionMemo', () => {
  const RTL_OVERRIDE = String.fromCodePoint(0x202e);
  const NEWLINE = String.fromCodePoint(0x0a);

  const transaction = ({
    memo = 0n,
    icrc1Memo,
  }: {
    memo?: bigint;
    icrc1Memo?: Uint8Array;
  } = {}): IcpIndexDid.Transaction => ({
    memo,
    icrc1_memo: icrc1Memo === undefined ? [] : [icrc1Memo],
    operation: {
      Transfer: {
        to: ICP_ADDRESS,
        fee: { e8s: 10_000n },
        from: ICP_ADDRESS,
        amount: { e8s: 100_000_000n },
        spender: [],
      },
    },
    timestamp: [],
    created_at_time: [],
  });

  it('returns undefined when the transaction carries no memo', () => {
    expect(
      formatTransactionMemo({ transaction: transaction(), type: TransactionType.RECEIVE }),
    ).toBeUndefined();
  });

  it('decodes an ICRC-1 memo as text', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({ icrc1Memo: encodeMemoToIcrc1('rent for July') }),
        type: TransactionType.RECEIVE,
      }),
    ).toEqual({ kind: 'text', value: 'rent for July' });
  });

  it('prefers the ICRC-1 memo over the numeric one', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({ memo: 42n, icrc1Memo: encodeMemoToIcrc1('note') }),
        type: TransactionType.SEND,
      }),
    ).toEqual({ kind: 'text', value: 'note' });
  });

  it('ignores an ICRC-1 memo that is not valid UTF-8', () => {
    // 0xFF is never a valid UTF-8 lead byte, so this stands in for the binary
    // payloads other ledger flows put in the field.
    expect(
      formatTransactionMemo({
        transaction: transaction({ icrc1Memo: new Uint8Array([0xff, 0x00, 0xfe]) }),
        type: TransactionType.RECEIVE,
      }),
    ).toBeUndefined();
  });

  it('strips control and bidi characters from a text memo', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({
          icrc1Memo: encodeMemoToIcrc1(`in${RTL_OVERRIDE}voice${NEWLINE}7`),
        }),
        type: TransactionType.RECEIVE,
      }),
    ).toEqual({ kind: 'text', value: 'invoice7' });
  });

  it('returns undefined when a text memo is only unsafe characters', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({ icrc1Memo: encodeMemoToIcrc1(`${RTL_OVERRIDE}${NEWLINE}  `) }),
        type: TransactionType.RECEIVE,
      }),
    ).toBeUndefined();
  });

  it('shows a non-zero numeric memo', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({ memo: 1234567890n }),
        type: TransactionType.SEND,
      }),
    ).toEqual({ kind: 'numeric', value: '1234567890' });
  });

  it('treats a numeric memo of 0 as absent', () => {
    expect(
      formatTransactionMemo({ transaction: transaction({ memo: 0n }), type: TransactionType.SEND }),
    ).toBeUndefined();
  });

  it('hides memos on transaction types that use them for bookkeeping', () => {
    for (const type of [
      TransactionType.STAKE,
      TransactionType.MINT,
      TransactionType.BURN,
      TransactionType.APPROVE,
      TransactionType.UNKNOWN,
    ]) {
      expect(
        formatTransactionMemo({
          transaction: transaction({ memo: 42n, icrc1Memo: encodeMemoToIcrc1('note') }),
          type,
        }),
      ).toBeUndefined();
    }
  });

  it('shows memos on self-transfers', () => {
    expect(
      formatTransactionMemo({
        transaction: transaction({ icrc1Memo: encodeMemoToIcrc1('moving funds') }),
        type: TransactionType.SELF,
      }),
    ).toEqual({ kind: 'text', value: 'moving funds' });
  });
});
