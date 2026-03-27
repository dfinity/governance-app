import { describe, expect, it } from 'vitest';

import { TransactionType } from '@features/account/types';

import { detectTransactionType, getAmountE8s } from './transactionType';

type Operation = Parameters<typeof detectTransactionType>[0];

const USER_ACCOUNT = 'abc123';
const OTHER_ACCOUNT = 'xyz789';
const NEURON_ACCOUNT = 'neuron001';

const neuronAccountIds = new Set([NEURON_ACCOUNT]);

const makeTransfer = (from: string, to: string): Operation => ({
  Transfer: {
    from,
    to,
    amount: { e8s: 100_000_000n },
    fee: { e8s: 10_000n },
    spender: [],
  },
});

const makeMint = (to: string): Operation => ({
  Mint: { to, amount: { e8s: 50_000_000n } },
});

const makeBurn = (from: string): Operation => ({
  Burn: { from, amount: { e8s: 50_000_000n }, spender: [] },
});

const makeApprove = (from: string): Operation => ({
  Approve: {
    from,
    spender: OTHER_ACCOUNT,
    allowance: { e8s: 100_000_000n },
    expected_allowance: [],
    expires_at: [],
    fee: { e8s: 10_000n },
  },
});

describe('detectTransactionType', () => {
  it('returns MINT for Mint operations', () => {
    expect(detectTransactionType(makeMint(USER_ACCOUNT), USER_ACCOUNT, neuronAccountIds)).toBe(
      TransactionType.MINT,
    );
  });

  it('returns STAKE when sending to a neuron account', () => {
    expect(
      detectTransactionType(
        makeTransfer(USER_ACCOUNT, NEURON_ACCOUNT),
        USER_ACCOUNT,
        neuronAccountIds,
      ),
    ).toBe(TransactionType.STAKE);
  });

  it('returns SELF when from and to are the same account', () => {
    expect(
      detectTransactionType(
        makeTransfer(USER_ACCOUNT, USER_ACCOUNT),
        USER_ACCOUNT,
        neuronAccountIds,
      ),
    ).toBe(TransactionType.SELF);
  });

  it('returns SEND when from is the user account', () => {
    expect(
      detectTransactionType(
        makeTransfer(USER_ACCOUNT, OTHER_ACCOUNT),
        USER_ACCOUNT,
        neuronAccountIds,
      ),
    ).toBe(TransactionType.SEND);
  });

  it('returns RECEIVE when to is the user account', () => {
    expect(
      detectTransactionType(
        makeTransfer(OTHER_ACCOUNT, USER_ACCOUNT),
        USER_ACCOUNT,
        neuronAccountIds,
      ),
    ).toBe(TransactionType.RECEIVE);
  });

  it('returns UNKNOWN for Burn operations', () => {
    expect(detectTransactionType(makeBurn(USER_ACCOUNT), USER_ACCOUNT, neuronAccountIds)).toBe(
      TransactionType.UNKNOWN,
    );
  });

  it('returns UNKNOWN for Approve operations', () => {
    expect(detectTransactionType(makeApprove(USER_ACCOUNT), USER_ACCOUNT, neuronAccountIds)).toBe(
      TransactionType.UNKNOWN,
    );
  });
});

describe('getAmountE8s', () => {
  it('returns amount from Transfer operations', () => {
    expect(getAmountE8s(makeTransfer(USER_ACCOUNT, OTHER_ACCOUNT))).toBe(100_000_000n);
  });

  it('returns amount from Mint operations', () => {
    expect(getAmountE8s(makeMint(USER_ACCOUNT))).toBe(50_000_000n);
  });

  it('returns null for Burn operations', () => {
    expect(getAmountE8s(makeBurn(USER_ACCOUNT))).toBeNull();
  });

  it('returns null for Approve operations', () => {
    expect(getAmountE8s(makeApprove(USER_ACCOUNT))).toBeNull();
  });
});
