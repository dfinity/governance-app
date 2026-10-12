import {
  InsufficientFundsError,
  TransferError,
  TxTooOldError,
} from '@icp-sdk/canisters/ledger/icp';
import { GovernanceError, InsufficientAmountError } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { CanisterResponseError } from '@utils/errors/response';

import { getAmountRange, getErrorReason } from './properties';

describe('getErrorReason', () => {
  it('uses the variant of a canister response error in snake case', () => {
    expect(getErrorReason(new CanisterResponseError('Name too long', 'NameTooLong'))).toBe(
      'name_too_long',
    );
  });

  it('uses the governance error type', () => {
    expect(getErrorReason(new GovernanceError({ error_message: 'msg', error_type: 5 }))).toBe(
      'governance_5',
    );
  });

  it('maps the staking errors', () => {
    expect(getErrorReason(new InsufficientAmountError(100_000_000n))).toBe('insufficient_amount');
  });

  it('maps a specific ledger error before the generic transfer error', () => {
    expect(getErrorReason(new InsufficientFundsError(0n))).toBe('insufficient_funds');
    expect(getErrorReason(new TxTooOldError())).toBe('tx_too_old');
    expect(getErrorReason(new TransferError())).toBe('transfer_error');
  });

  it('does not return the message of an unknown error', () => {
    expect(getErrorReason(new Error('account 1234 failed'))).toBe('unknown');
    expect(getErrorReason('failed')).toBe('unknown');
  });
});

describe('getAmountRange', () => {
  it.each([
    [0.5, '<1'],
    [1, '1-10'],
    [9.99, '1-10'],
    [10, '10-100'],
    [250, '100-1k'],
    [1_000, '1k-10k'],
    [10_000, '10k+'],
    [2_000_000, '10k+'],
  ])('maps %s ICP to %s', (icp, range) => {
    expect(getAmountRange(icp)).toBe(range);
  });

  it('returns unknown for an invalid amount', () => {
    expect(getAmountRange(Number.NaN)).toBe('unknown');
    expect(getAmountRange(-1)).toBe('unknown');
  });
});
