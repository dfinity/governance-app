import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { useQuery } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';

import { NANOSECONDS_IN_SECOND } from '@constants/extra';
import { useIcpIndex } from '@hooks/icpIndex/useIcpIndex';
import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { QUERY_KEYS } from '@utils/query';

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
  if (!('Transfer' in operation)) return null;

  const transfer = operation.Transfer;
  const isSend = transfer.from === accountId;
  const type: AccountTransaction['type'] =
    isSend && neuronAccountIds.has(transfer.to) ? 'stake' : isSend ? 'send' : 'receive';

  const nanos = created_at_time[0]?.timestamp_nanos ?? txTimestamp[0]?.timestamp_nanos ?? 0n;
  const timestampSeconds = Number(nanos / BigInt(NANOSECONDS_IN_SECOND));

  return {
    id: tx.id,
    type,
    amountE8s: transfer.amount.e8s,
    timestamp: timestampSeconds,
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
  const { ready, authenticated, canister } = useIcpIndex();
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

  const query = useQuery({
    queryKey: [QUERY_KEYS.ACCOUNTS.RECENT_TRANSACTIONS, accountIds],
    queryFn: async () => {
      const results = await Promise.all(
        entries!.map(async (entry) => {
          const response = await canister!.getTransactions({
            maxResults: TRANSACTIONS_PER_ACCOUNT,
            accountIdentifier: entry.accountId,
            certified: false,
          });
          return response.transactions
            .map((tx) => toAccountTransaction(tx, entry.accountId, entry.name, neuronAccountIds))
            .filter((tx): tx is AccountTransaction => tx !== null);
        }),
      );

      return results
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_RECENT_TRANSACTIONS);
    },
    enabled: !!entries && ready && authenticated,
  });

  return { data: query.data, isLoading: query.isLoading };
};
