import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { describe, expect, it, vi } from 'vitest';

import {
  fetchTransactionsSince,
  type GetTransactionsPage,
  MAX_TRANSACTIONS_PAGES,
} from './fetchTransactions';
import { MAIN, OTHER, transferTx } from './testUtils';

const DAY_MS = 24 * 60 * 60 * 1_000;
const RANGE = { fromMs: Date.UTC(2026, 0, 1), toMs: Date.UTC(2026, 11, 31) };

/** Transactions with IDs `count` down to 1, one day apart, the newest on `newestMs`. */
const history = (count: number, newestMs: number) =>
  Array.from({ length: count }, (_, index) =>
    transferTx({
      id: BigInt(count - index),
      ms: newestMs - index * DAY_MS,
      from: OTHER,
      to: MAIN,
      e8s: 1n,
    }),
  );

/** A fake index that serves `transactions` in pages of `pageSize`, as the real one does. */
const fakeIndex = (transactions: IcpIndexDid.TransactionWithId[], pageSize: number) =>
  vi.fn<GetTransactionsPage>(async ({ start }) => {
    const older = transactions.filter(({ id }) => start === undefined || id < start);
    return {
      balance: 0n,
      transactions: older.slice(0, pageSize),
      oldest_tx_id: transactions.length > 0 ? [transactions.at(-1)!.id] : [],
    };
  });

describe('fetchTransactionsSince', () => {
  it('stops at the oldest transaction of the account', async () => {
    const getPage = fakeIndex(history(5, Date.UTC(2026, 5, 1)), 2);

    const result = await fetchTransactionsSince({ accountIdentifier: MAIN, range: RANGE, getPage });

    expect(result.complete).toBe(true);
    expect(result.transactions.map(({ id }) => id)).toEqual([5n, 4n, 3n, 2n, 1n]);
    expect(getPage.mock.calls.map(([{ start }]) => start)).toEqual([undefined, 4n, 2n]);
  });

  it('stops at the first page that reaches before the range', async () => {
    const getPage = fakeIndex(history(100, Date.UTC(2026, 0, 3)), 2);

    const result = await fetchTransactionsSince({ accountIdentifier: MAIN, range: RANGE, getPage });

    expect(result.complete).toBe(true);
    expect(getPage).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page', async () => {
    const getPage = fakeIndex([], 2);

    const result = await fetchTransactionsSince({ accountIdentifier: MAIN, range: RANGE, getPage });

    expect(result).toEqual({ transactions: [], complete: true });
  });

  it('reports an incomplete list at the page limit', async () => {
    const getPage = fakeIndex(history(MAX_TRANSACTIONS_PAGES + 5, Date.UTC(2026, 11, 1)), 1);

    const result = await fetchTransactionsSince({
      accountIdentifier: MAIN,
      range: { fromMs: 0, toMs: RANGE.toMs },
      getPage,
    });

    expect(result.complete).toBe(false);
    expect(getPage).toHaveBeenCalledTimes(MAX_TRANSACTIONS_PAGES);
  });
});
