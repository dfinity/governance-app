import { nonNullish } from '@dfinity/utils';
import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { QUERY_KEYS, stringifyKeys } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

const POLLING_INTERVAL_MS = 2000;
const NEW_TRANSACTION_TOAST_ID = 'new-transaction-detected';

/**
 * Lightweight polling hook that detects new transactions using query-only
 * (non-certified) calls to the ICP Index canister and invalidates the
 * certified balance and transaction queries when a change is detected.
 *
 * Why transactions instead of balance:
 * - The ICP Index canister lives on an application subnet, not the NNS subnet.
 * - The ICP Ledger (balance) lives on the NNS subnet, which is critical
 *   shared infrastructure that shouldn't bear polling load.
 * - Polling the Index keeps the NNS subnet free of unnecessary query traffic.
 *
 * Only a single cheap query call is made per interval (maxResults: 1).
 * Certified/update calls are triggered on-demand only when a new
 * transaction is actually detected.
 */
export const useIcpIndexTransactionsPolling = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpIndex();

  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
  });

  const lastTransactionIdRef = useRef<bigint | undefined>(undefined);

  const { data: latestTxId } = useQuery({
    queryKey: [...stringifyKeys(['transactionsPolling', accountIdentifier])],
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
    if (!nonNullish(latestTxId)) return;

    const previous = lastTransactionIdRef.current;
    lastTransactionIdRef.current = latestTxId;

    // Skip the first read — we only care about changes.
    if (!nonNullish(previous)) return;

    if (latestTxId !== previous) {
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
  }, [latestTxId, queryClient, t]);
};
