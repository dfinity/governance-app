import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import type { ReportRange } from './period';
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
  transactions: IcpIndexDid.TransactionWithId[];
  /** `false` when the page limit stopped the fetch before the start of the range. */
  complete: boolean;
};

/**
 * Loads the transactions of an account from the newest one back to the start of the range.
 * The index returns them newest first, and `start` excludes the transaction with that ID.
 * Transactions newer than the range are skipped later, with the rest of the range filter.
 */
export const fetchTransactionsSince = async ({
  accountIdentifier,
  range,
  getPage,
}: {
  accountIdentifier: string;
  range: ReportRange;
  getPage: GetTransactionsPage;
}): Promise<FetchedTransactions> => {
  const transactions: IcpIndexDid.TransactionWithId[] = [];
  let start: bigint | undefined;

  for (let page = 0; page < MAX_TRANSACTIONS_PAGES; page++) {
    const response = await getPage({
      accountIdentifier,
      start,
      maxResults: TRANSACTIONS_PAGE_SIZE,
    });
    transactions.push(...response.transactions);

    const last = response.transactions.at(-1);
    if (last === undefined) return { transactions, complete: true };

    const lastTimestampMs = getTransactionTimestampMs(last.transaction);
    const isOldest = response.oldest_tx_id[0] === last.id;
    const isBeforeRange = lastTimestampMs !== undefined && lastTimestampMs < range.fromMs;
    // A short page does not end the list: the index can return fewer than `maxResults`.
    if (isOldest || isBeforeRange) return { transactions, complete: true };

    start = last.id;
  }

  return { transactions, complete: false };
};
