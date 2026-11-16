import { TxDuplicateError, TxTooOldError } from '@icp-sdk/canisters/ledger/icp';
import { IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';
import { describe, expect, it } from 'vitest';

import { duplicateTransferOf } from './duplicateTransfer';

describe('duplicateTransferOf', () => {
  it('reads the block of an ICP duplicate', () => {
    expect(duplicateTransferOf(new TxDuplicateError(7n))).toBe(7n);
  });

  it('reads the block of an ICRC-1 duplicate', () => {
    const error = new IcrcTransferError({ errorType: { Duplicate: { duplicate_of: 8n } } });

    expect(duplicateTransferOf(error)).toBe(8n);
  });

  it('is undefined for every other error', () => {
    expect(duplicateTransferOf(new TxTooOldError(0))).toBeUndefined();
    expect(
      duplicateTransferOf(new IcrcTransferError({ errorType: { TooOld: null } })),
    ).toBeUndefined();
    expect(duplicateTransferOf(new Error('x'))).toBeUndefined();
  });
});
