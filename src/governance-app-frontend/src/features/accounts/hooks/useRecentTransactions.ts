import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';
import { detectTransactionType } from '@features/transactions/utils/transactionType';

import { NANOSECONDS_IN_SECOND } from '@constants/extra';
import { useIcpIndexAccountsTransactions } from '@hooks/icpIndex';
import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';

import type { AccountTransaction } from '../types';

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
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const nnsDappAccount = useNnsDappAccount();
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();

  const accountDetails = nnsDappAccount.data?.response;

  const entries = useMemo(() => {
    if (!identity) return undefined;

    const mainAccountId = AccountIdentifier.fromPrincipal({
      principal: identity.getPrincipal(),
    }).toHex();

    const main = { name: t(($) => $.accounts.mainAccount), accountId: mainAccountId };
    const subs = (accountDetails?.sub_accounts ?? []).map((sa) => ({
      name: sa.name,
      accountId: sa.account_identifier,
    }));
    return [main, ...subs];
  }, [identity, accountDetails, t]);

  const accountIds = entries?.map((a) => a.accountId);
  const transactionsQuery = useIcpIndexAccountsTransactions({
    accountIds: accountIds ?? [],
    maxResults: TRANSACTIONS_PER_ACCOUNT,
    enabled: !!entries,
  });

  const data = useMemo(() => {
    if (!entries) return undefined;

    const results = entries.map((entry) =>
      (transactionsQuery.byAccountId[entry.accountId]?.data?.transactions ?? [])
        .map((tx) => toAccountTransaction(tx, entry.accountId, entry.name, neuronAccountIds))
        .filter((tx): tx is AccountTransaction => tx !== null),
    );

    return results
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_TRANSACTIONS);
  }, [entries, neuronAccountIds, transactionsQuery.byAccountId]);

  return { data, isLoading: transactionsQuery.isLoading };
};
