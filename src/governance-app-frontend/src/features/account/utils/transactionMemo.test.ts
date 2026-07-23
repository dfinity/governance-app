import { describe, expect, it } from 'vitest';

import {
  encodeMemoToIcp,
  encodeMemoToIcrc1,
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
