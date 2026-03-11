import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { useMemo } from 'react';

import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';
import { detectTransactionType } from '@features/transactions/utils/transactionType';

import { NANOSECONDS_IN_SECOND } from '@constants/extra';
import { useIcpIndexAccountsTransactions } from '@hooks/icpIndex';

import type { AccountMeta, AccountTransaction } from '../types';
import { useMainAccountMeta } from './useMainAccountMeta';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const MAX_RECENT_TRANSACTIONS = 10;
const TRANSACTIONS_PER_ACCOUNT = 5n;

function toAccountTransaction(
  tx: IcpIndexDid.TransactionWithId,
  accountId: string,
  accountName: string,
  neuronAccountIds: Set<string>,
): AccountTransaction | null {
  const { operation, created_at_time, timestamp: txTimestamp } = tx.transaction;
  const type = detectTransactionType(operation, accountId, neuronAccountIds);
  if (type === 'unknown' || !('Transfer' in operation)) return null;

  const transfer = operation.Transfer;

  const nanos = created_at_time[0]?.timestamp_nanos ?? txTimestamp[0]?.timestamp_nanos ?? 0n;
  const timestampSeconds = Number(nanos / BigInt(NANOSECONDS_IN_SECOND));

  return {
    id: tx.id,
    type,
    amountE8s: transfer.amount.e8s,
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
  const mainAccountMeta = useMainAccountMeta();
  const subaccountsMetadata = useSubaccountsMetadata();
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();

  const accountMetas = useMemo<AccountMeta[]>(() => {
    if (!mainAccountMeta.data) return [];
    return [mainAccountMeta.data, ...subaccountsMetadata.data];
  }, [mainAccountMeta.data, subaccountsMetadata.data]);

  const accountIds = accountMetas.map((a) => a.accountId);
  const transactionsQuery = useIcpIndexAccountsTransactions({
    accountIds,
    maxResults: TRANSACTIONS_PER_ACCOUNT,
    enabled: accountMetas.length > 0,
  });

  const data = useMemo(() => {
    if (accountMetas.length === 0) return undefined;

    const results = accountMetas.map((meta) =>
      (transactionsQuery.byAccountId[meta.accountId]?.data?.transactions ?? [])
        .map((tx) => toAccountTransaction(tx, meta.accountId, meta.name, neuronAccountIds))
        .filter((tx): tx is AccountTransaction => tx !== null),
    );

    return results
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_TRANSACTIONS);
  }, [accountMetas, neuronAccountIds, transactionsQuery.byAccountId]);

  return { data, isLoading: transactionsQuery.isLoading };
};
