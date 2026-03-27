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

function getAmountE8s(operation: IcpIndexDid.Operation): bigint | null {
  if ('Transfer' in operation) return operation.Transfer.amount.e8s;
  if ('Mint' in operation) return operation.Mint.amount.e8s;
  return null;
}

function toAccountTransaction(
  tx: IcpIndexDid.TransactionWithId,
  accountId: string,
  accountName: string,
  neuronAccountIds: Set<string>,
): AccountTransaction | null {
  const { operation, created_at_time, timestamp: txTimestamp } = tx.transaction;
  const type = detectTransactionType(operation, accountId, neuronAccountIds);
  if (type === TransactionType.UNKNOWN) return null;

  const amountE8s = getAmountE8s(operation);
  if (amountE8s === null) return null;

  const nanos = created_at_time[0]?.timestamp_nanos ?? txTimestamp[0]?.timestamp_nanos ?? 0n;
  const timestampSeconds = Number(nanos / BigInt(NANOSECONDS_IN_SECOND));

  return {
    id: tx.id,
    type,
    amountE8s,
    timestamp: timestampSeconds,
    accountId,
    accountName,
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

  const isLoading = subaccountsMetadata.isLoading || transactionsQuery.isLoading;

  return { data, isLoading };
};
