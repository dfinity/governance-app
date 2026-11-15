import { describe, expect, it, vi } from 'vitest';

import type { GetTransactionsPage } from './fetchTransactions';
import { loadReportTransactions, mapWithLimit } from './loadReportData';
import { MAIN, NEURON, OTHER, transferTx } from './testUtils';
import { type ReportEntity, ReportTransactionType } from './transactionsCsv';

vi.mock('@common/canisters', () => ({
  getIcpIndexCanister: vi.fn(),
  getNnsGovernanceCanister: vi.fn(),
}));

const RANGE = { fromMs: Date.UTC(2025, 0, 1), toMs: Date.UTC(2026, 0, 1) };

const entities: ReportEntity[] = [
  { kind: 'account', accountId: MAIN, name: 'Main' },
  { kind: 'neuron', accountId: NEURON, neuronId: 1n },
];

const byAccount: Record<string, ReturnType<typeof transferTx>[]> = {
  [MAIN]: [
    transferTx({ id: 4n, ms: Date.UTC(2026, 0, 2), from: OTHER, to: MAIN, e8s: 1n }),
    transferTx({ id: 3n, ms: Date.UTC(2025, 5, 1), from: MAIN, to: NEURON, e8s: 2n }),
    transferTx({ id: 1n, ms: Date.UTC(2024, 11, 31), from: OTHER, to: MAIN, e8s: 3n }),
  ],
  [NEURON]: [transferTx({ id: 3n, ms: Date.UTC(2025, 5, 1), from: MAIN, to: NEURON, e8s: 2n })],
};

const getPage: GetTransactionsPage = async ({ accountIdentifier }) => ({
  balance: 0n,
  transactions: byAccount[accountIdentifier],
  oldest_tx_id: [byAccount[accountIdentifier].at(-1)!.id],
});

describe('loadReportTransactions', () => {
  it('keeps only the transactions in the range, as each entity sees them', async () => {
    const { results, complete } = await loadReportTransactions({ entities, range: RANGE, getPage });

    expect(complete).toBe(true);
    expect(results).toEqual([
      {
        entity: entities[0],
        transactions: [
          expect.objectContaining({ id: 3n, type: ReportTransactionType.Stake, amountE8s: -2n }),
        ],
      },
      {
        entity: entities[1],
        transactions: [
          expect.objectContaining({ id: 3n, type: ReportTransactionType.Stake, amountE8s: 2n }),
        ],
      },
    ]);
  });

  it('rejects when one account fails, so that no partial file is saved', async () => {
    const failing: GetTransactionsPage = async (params) =>
      params.accountIdentifier === NEURON ? Promise.reject(new Error('down')) : getPage(params);

    await expect(
      loadReportTransactions({ entities, range: RANGE, getPage: failing }),
    ).rejects.toThrow('down');
  });
});

describe('mapWithLimit', () => {
  it('keeps the order and runs at most `limit` tasks at one time', async () => {
    let running = 0;
    let maxRunning = 0;
    const task = async (item: number) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5 - item));
      running--;
      return item * 10;
    };

    expect(await mapWithLimit([1, 2, 3, 4, 5], 2, task)).toEqual([10, 20, 30, 40, 50]);
    expect(maxRunning).toBe(2);
  });

  it('starts no new task after a failure and lets the running ones settle first', async () => {
    const started: number[] = [];
    let slowSettled = false;
    const task = async (item: number) => {
      started.push(item);
      if (item === 1) throw new Error('down');
      await new Promise((resolve) => setTimeout(resolve, 10));
      slowSettled = true;
      return item;
    };

    await expect(mapWithLimit([1, 2, 3, 4], 2, task)).rejects.toThrow('down');
    expect(started).toEqual([1, 2]);
    expect(slowSettled).toBe(true);
  });
});
