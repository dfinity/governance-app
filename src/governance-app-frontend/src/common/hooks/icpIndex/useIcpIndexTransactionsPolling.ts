import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

const POLLING_INTERVAL_MS = 2000;
const NEW_TRANSACTION_TOAST_ID = 'new-transaction-detected';

/**
 * Lightweight polling hook that detects new transactions using query-only
 * (non-certified) calls to the ICP Index canister and invalidates the
 * certified balance and transaction queries when a change is detected.
 *
 * Only a single cheap query call is made per interval (maxResults: 1).
 */
export const useIcpIndexTransactionsPolling = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpIndex();

  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
  });

  // undefined = not yet polled, null = polled but no transactions, bigint = latest tx id.
  const lastTransactionIdRef = useRef<bigint | null | undefined>(undefined);

  const { data: latestTxId, isSuccess } = useQuery({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS_POLLING, accountIdentifier.toHex()],
    queryFn: async () => {
      const response = await canister!.getTransactions({
        maxResults: BigInt(1),
        start: undefined,
        accountIdentifier,
        certified: false,
      });
      return response.transactions[0]?.id;
    },
    enabled: ready && authenticated,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isSuccess) return;

    const previous = lastTransactionIdRef.current;
    const current = latestTxId ?? null;
    lastTransactionIdRef.current = current;

    // First successful poll —> store without triggering notifications.
    if (previous === undefined) return;

    if (current !== previous) {
      // New transaction detected — invalidate certified balance and transactions.
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      // Fixed ID prevents stacking if multiple transactions arrive in quick succession.
      toast.info(
        t(($) => $.account.newTransaction),
        {
          id: NEW_TRANSACTION_TOAST_ID,
          description: t(($) => $.account.newTransactionDescription),
          duration: 4000,
          closeButton: true,
        },
      );
    }
  }, [latestTxId, isSuccess, queryClient, t]);
};
