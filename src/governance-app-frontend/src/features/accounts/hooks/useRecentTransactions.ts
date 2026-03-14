import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';
import { TransactionType } from '@features/account/types';
import { detectTransactionType } from '@features/transactions/utils/transactionType';

import { NANOSECONDS_IN_SECOND } from '@constants/extra';
import { useIcpIndexAccountsTransactions } from '@hooks/icpIndex';

import type { AccountMetadata, AccountTransaction } from '../types';
import { useMainAccountMetadata } from './useMainAccountMetadata';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const MAX_RECENT_TRANSACTIONS = 10;

function toAccountTransaction(
  tx: IcpIndexDid.TransactionWithId,
  accountId: string,
  accountName: string,
  neuronAccountIds: Set<string>,
): AccountTransaction | null {
  const { operation, created_at_time, timestamp: txTimestamp } = tx.transaction;
  const type = detectTransactionType(operation, accountId, neuronAccountIds);
  if (type === TransactionType.UNKNOWN || !('Transfer' in operation)) return null;

  const transfer = operation.Transfer;

  const nanos = created_at_time[0]?.timestamp_nanos ?? txTimestamp[0]?.timestamp_nanos ?? 0n;
  const timestampSeconds = Number(nanos / BigInt(NANOSECONDS_IN_SECOND));

  const counterparty = type === TransactionType.RECEIVE ? transfer.from : transfer.to;

  return {
    id: tx.id,
    type,
    amountE8s: transfer.amount.e8s,
    timestamp: timestampSeconds,
    accountId,
    accountName,
    counterparty,
  };
}

/**
 * Fetches the most recent transactions across all user accounts (main + sub-accounts).
 * Transactions are merged, sorted by timestamp descending, and capped.
 */
export const useRecentTransactions = () => {
  const mainAccountMetadata = useMainAccountMetadata();
  const subaccountsMetadata = useSubaccountsMetadata();
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();

  const accountsMetadata: AccountMetadata[] = mainAccountMetadata.data
    ? [mainAccountMetadata.data, ...subaccountsMetadata.data]
    : [];

  const accountIds = accountsMetadata.map((a) => a.accountId);
  const transactionsQuery = useIcpIndexAccountsTransactions({
    accountIds,
    enabled: accountsMetadata.length > 0,
  });

  if (accountsMetadata.length === 0) {
    return { data: undefined, isLoading: transactionsQuery.isLoading };
  }

  const results = accountsMetadata.map((meta) =>
    (transactionsQuery.byAccountId[meta.accountId]?.data?.response?.transactions ?? [])
      .map((tx) => toAccountTransaction(tx, meta.accountId, meta.name, neuronAccountIds))
      .filter((tx): tx is AccountTransaction => tx !== null),
  );

  const data = results
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT_TRANSACTIONS);

  return { data, isLoading: transactionsQuery.isLoading };
};
