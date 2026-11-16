import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import { getTransactionTimestampMs } from './transactionsCsv';

export type GetTransactionsPage = (params: {
  accountIdentifier: string;
  start: bigint | undefined;
  maxResults: bigint;
}) => Promise<IcpIndexDid.GetAccountIdentifierTransactionsResponse>;

/** A query call returns at most 2,000 transactions. */
export const TRANSACTIONS_PAGE_SIZE = 1_000n;
/** Stops after 50,000 transactions for one account. */
export const MAX_TRANSACTIONS_PAGES = 50;

export type FetchedTransactions = {
  /** The balance of the account when the first page loaded. */
  balanceE8s: bigint;
  transactions: IcpIndexDid.TransactionWithId[];
  /** `false` when the page limit stopped the fetch before the start of the range. */
  complete: boolean;
};

/**
 * Loads the transactions of an account from the newest one back to `fromMs`.
 * The index returns them newest first, and `start` excludes the transaction with that ID.
 */
export const fetchTransactionsSince = async ({
  accountIdentifier,
  fromMs,
  getPage,
}: {
  accountIdentifier: string;
  fromMs: number;
  getPage: GetTransactionsPage;
}): Promise<FetchedTransactions> => {
  const transactions: IcpIndexDid.TransactionWithId[] = [];
  let balanceE8s: bigint | undefined;
  let start: bigint | undefined;

  for (let page = 0; page < MAX_TRANSACTIONS_PAGES; page++) {
    const response = await getPage({
      accountIdentifier,
      start,
      maxResults: TRANSACTIONS_PAGE_SIZE,
    });
    transactions.push(...response.transactions);
    balanceE8s ??= response.balance;

    const last = response.transactions.at(-1);
    if (last === undefined) return { balanceE8s, transactions, complete: true };

    const lastTimestampMs = getTransactionTimestampMs(last.transaction);
    const isOldest = response.oldest_tx_id[0] === last.id;
    const isBeforeRange = lastTimestampMs !== undefined && lastTimestampMs < fromMs;
    // A short page does not end the list: the index can return fewer than `maxResults`.
    if (isOldest || isBeforeRange) return { balanceE8s, transactions, complete: true };

    start = last.id;
  }

  return { balanceE8s: balanceE8s ?? 0n, transactions, complete: false };
};
