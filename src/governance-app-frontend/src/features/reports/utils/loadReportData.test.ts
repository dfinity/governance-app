import { describe, expect, it, vi } from 'vitest';

import type { GetTransactionsPage } from './fetchTransactions';
import { loadReportTransactions } from './loadReportData';
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
