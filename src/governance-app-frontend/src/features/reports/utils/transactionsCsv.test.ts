import { describe, expect, it } from 'vitest';

import type { ReportRateLookup } from './rates';
import { MAIN, mintTx, NEURON, OTHER, SAVINGS, transferTx } from './testUtils';
import {
  buildTransactionsCsv,
  mapReportTransaction,
  type ReportEntity,
  ReportTransactionType,
  type TransactionsCsvLabels,
} from './transactionsCsv';

const main: ReportEntity = { kind: 'account', accountId: MAIN, name: 'Main' };
const neuron: ReportEntity = { kind: 'neuron', accountId: NEURON, neuronId: 12345678901234567n };
const neuronAccountIds = new Set([NEURON]);
const MS = Date.UTC(2026, 2, 1, 10);

const map = (entity: ReportEntity, transaction: ReturnType<typeof transferTx>) =>
  mapReportTransaction({ entity, transaction, neuronAccountIds });

describe('mapReportTransaction', () => {
  it('maps an outgoing transfer to a debit with the fee', () => {
    expect(map(main, transferTx({ id: 1n, ms: MS, from: MAIN, to: OTHER, e8s: 5n }))).toEqual({
      id: 1n,
      timestampMs: MS,
      type: ReportTransactionType.Sent,
      from: MAIN,
      to: OTHER,
      amountE8s: -5n,
      feeE8s: 10_000n,
    });
  });

  it('maps an incoming transfer to a credit without a fee', () => {
    const row = map(main, transferTx({ id: 1n, ms: MS, from: OTHER, to: MAIN, e8s: 5n }));

    expect(row).toMatchObject({ type: ReportTransactionType.Received, amountE8s: 5n });
    expect(row.feeE8s).toBeUndefined();
  });

  it('maps a transfer to a neuron account to a stake', () => {
    expect(
      map(main, transferTx({ id: 1n, ms: MS, from: MAIN, to: NEURON, e8s: 5n })),
    ).toMatchObject({ type: ReportTransactionType.Stake, amountE8s: -5n });
  });

  it('maps the neuron side of a stake and of a disburse', () => {
    expect(
      map(neuron, transferTx({ id: 1n, ms: MS, from: MAIN, to: NEURON, e8s: 5n })),
    ).toMatchObject({ type: ReportTransactionType.Stake, amountE8s: 5n, feeE8s: undefined });
    expect(
      map(neuron, transferTx({ id: 2n, ms: MS, from: NEURON, to: MAIN, e8s: 5n })),
    ).toMatchObject({ type: ReportTransactionType.Disburse, amountE8s: -5n, feeE8s: 10_000n });
  });

  it('maps a self transfer to no change of balance', () => {
    expect(map(main, transferTx({ id: 1n, ms: MS, from: MAIN, to: MAIN, e8s: 5n }))).toMatchObject({
      type: ReportTransactionType.SelfTransfer,
      amountE8s: 0n,
      feeE8s: 10_000n,
    });
  });

  it('maps a mint to a reward', () => {
    expect(map(main, mintTx({ id: 1n, ms: MS, to: MAIN, e8s: 7n }))).toMatchObject({
      type: ReportTransactionType.Reward,
      from: '',
      to: MAIN,
      amountE8s: 7n,
    });
  });
});

const labels: TransactionsCsvLabels = {
  headers: {
    index: 'Index',
    date: 'Date',
    account: 'Account',
    accountId: 'Account ID',
    neuronId: 'Neuron ID',
    type: 'Type',
    from: 'From',
    to: 'To',
    amount: 'Amount',
    fee: 'Fee',
    price: 'Price',
    value: 'Value',
    rateDate: 'Rate date',
  },
  types: {
    [ReportTransactionType.Received]: 'Received',
    [ReportTransactionType.Sent]: 'Sent',
    [ReportTransactionType.Stake]: 'Stake',
    [ReportTransactionType.Disburse]: 'Disburse',
    [ReportTransactionType.SelfTransfer]: 'Self',
    [ReportTransactionType.Reward]: 'Reward',
    [ReportTransactionType.Burn]: 'Burn',
    [ReportTransactionType.Approve]: 'Approve',
    [ReportTransactionType.Unknown]: 'Unknown',
  },
};

const noRate: ReportRateLookup = () => undefined;

describe('buildTransactionsCsv', () => {
  it('writes one flat table, newest first, with one row for each side of an own transfer', () => {
    // The rate of the day before, as for a day without a rate.
    const rateDayMs = Date.UTC(2026, 1, 28);
    const rateLookup: ReportRateLookup = () => ({ dayMs: rateDayMs, icpToFiatE8s: 264_000_000n });
    const savings: ReportEntity = { kind: 'account', accountId: SAVINGS, name: 'Savings' };
    const own = transferTx({ id: 2n, ms: MS + 1_000, from: MAIN, to: SAVINGS, e8s: 100_000_000n });
    const reward = mintTx({ id: 1n, ms: MS, to: MAIN, e8s: 50_000_000n });

    const csv = buildTransactionsCsv({
      results: [
        { entity: main, transactions: [map(main, own), map(main, reward)] },
        { entity: savings, transactions: [map(savings, own)] },
        { entity: neuron, transactions: [] },
      ],
      labels,
      rateLookup,
    });

    expect(csv.split('\r\n')).toEqual([
      '\uFEFFIndex,Date,Account,Account ID,Neuron ID,Type,From,To,Amount,Fee,Price,Value,Rate date',
      `2,2026-03-01 10:00:01,Main,${MAIN},,Sent,${MAIN},${SAVINGS},-1.00000000,0.00010000,2.64000000,-2.64,2026-02-28`,
      `2,2026-03-01 10:00:01,Savings,${SAVINGS},,Received,${MAIN},${SAVINGS},+1.00000000,,2.64000000,+2.64,2026-02-28`,
      `1,2026-03-01 10:00:00,Main,${MAIN},,Reward,,${MAIN},+0.50000000,,2.64000000,+1.32,2026-02-28`,
      '',
    ]);
  });

  it('leaves the fiat cells empty without a rate', () => {
    const csv = buildTransactionsCsv({
      results: [
        { entity: main, transactions: [map(main, mintTx({ id: 1n, ms: MS, to: MAIN, e8s: 1n }))] },
      ],
      labels,
      rateLookup: noRate,
    });

    expect(csv).toContain(`,Reward,,${MAIN},+0.00000001,,,,\r\n`);
  });

  it('keeps an account name from running as a formula', () => {
    const named: ReportEntity = { kind: 'account', accountId: SAVINGS, name: '=SUM(1,2)' };
    const csv = buildTransactionsCsv({
      results: [
        {
          entity: named,
          transactions: [
            map(named, transferTx({ id: 5n, ms: MS, from: OTHER, to: SAVINGS, e8s: 1n })),
          ],
        },
      ],
      labels,
      rateLookup: noRate,
    });

    expect(csv).toContain(`,"'=SUM(1,2)",${SAVINGS},`);
  });

  it('writes the neuron ID as spreadsheet text', () => {
    const csv = buildTransactionsCsv({
      results: [
        {
          entity: neuron,
          transactions: [
            map(neuron, transferTx({ id: 3n, ms: MS, from: MAIN, to: NEURON, e8s: 1n })),
          ],
        },
      ],
      labels,
      rateLookup: noRate,
    });

    expect(csv).toContain(`,${NEURON},"=""12345678901234567""",Stake,`);
  });
});
