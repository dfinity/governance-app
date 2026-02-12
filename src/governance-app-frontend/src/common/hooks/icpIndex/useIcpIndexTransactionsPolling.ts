import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

const POLLING_INTERVAL_MS = 2000;

const formatTransferAmount = (operation: IcpIndexDid.Operation): string | undefined => {
  if (!('Transfer' in operation)) return undefined;
  return formatNumber(bigIntDiv(operation.Transfer.amount.e8s, E8Sn), {
    minFraction: 2,
    maxFraction: 8,
  });
};

const isReceivedTransfer = (
  operation: IcpIndexDid.Operation,
  accountId: string,
): operation is Extract<IcpIndexDid.Operation, { Transfer: unknown }> =>
  'Transfer' in operation && operation.Transfer.to === accountId;

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

  const { data: latestTransaction, isSuccess } = useQuery({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS_POLLING, accountIdentifier],
    queryFn: async () => {
      const response = await canister!.getTransactions({
        maxResults: BigInt(1),
        start: undefined,
        accountIdentifier,
        certified: false,
      });
      return response.transactions[0];
    },
    enabled: ready && authenticated,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isSuccess) return;

    const latestId = latestTransaction?.id;
    const previous = lastTransactionIdRef.current;
    const current = latestId ?? null;
    lastTransactionIdRef.current = current;

    // First successful poll —> store without triggering notifications.
    if (previous === undefined) return;

    if (current !== previous) {
      // New transaction detected —> invalidate certified balance and transactions.
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      if (latestTransaction) {
        const { operation } = latestTransaction.transaction;
        const accountId = accountIdentifier.toHex();
        const amount = formatTransferAmount(operation);

        if (amount && isReceivedTransfer(operation, accountId)) {
          const sender = operation.Transfer.from;
          const truncatedSender = shortenId(sender, 6);

          toast.info(
            t(($) => $.account.newTransaction),
            {
              description: t(($) => $.account.newTransactionDescription, {
                value: amount,
                sender: truncatedSender,
              }),
              duration: 4000,
              closeButton: true,
            },
          );
        }
      }
    }
  }, [latestTransaction, isSuccess, queryClient, t, accountIdentifier]);
};
