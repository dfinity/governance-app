import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useMainAccountMetadata } from '@features/accounts/hooks/useMainAccountMetadata';
import { useSubaccountsMetadata } from '@features/accounts/hooks/useSubaccountsMetadata';

import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

const POLLING_INTERVAL_MS = 3000;

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

type AccountPollResult = {
  accountId: string;
  transaction: IcpIndexDid.TransactionWithId | null;
};

/**
 * Lightweight polling hook that detects new transactions across all user
 * accounts using query-only (non-certified) calls to the ICP Index canister
 * and invalidates the certified balance and transaction queries when a
 * change is detected.
 *
 * TODO: Move this hook to `features/transactions/hooks/`.
 */
export const useIcpIndexTransactionsPolling = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { ready, authenticated, canister } = useIcpIndex();

  const mainAccount = useMainAccountMetadata();
  const subaccounts = useSubaccountsMetadata();
  const accountIds = [
    ...(mainAccount.data ? [mainAccount.data.accountId] : []),
    ...subaccounts.data.map((a) => a.accountId),
  ];

  // accountId -> last seen transaction id. undefined = not yet polled for that account.
  const lastTxIdsRef = useRef<Map<string, bigint | null>>(new Map());

  const { data: results, isSuccess } = useQuery({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS_POLLING, ...accountIds],
    queryFn: async (): Promise<AccountPollResult[]> => {
      return Promise.all(
        accountIds.map(async (accountId) => {
          const accountIdentifier = AccountIdentifier.fromHex(accountId);
          const response = await canister!.getTransactions({
            maxResults: BigInt(1),
            start: undefined,
            accountIdentifier,
            certified: false,
          });
          return { accountId, transaction: response.transactions[0] ?? null };
        }),
      );
    },
    enabled: ready && authenticated && accountIds.length > 0,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isSuccess || !results) return;

    let hasChange = false;

    for (const { accountId, transaction } of results) {
      const current = transaction?.id ?? null;
      const previous = lastTxIdsRef.current.get(accountId);
      lastTxIdsRef.current.set(accountId, current);

      // First time seeing this account — store baseline, don't treat as a change.
      if (previous === undefined) continue;
      if (current === previous) continue;

      hasChange = true;

      if (transaction) {
        const { operation } = transaction.transaction;
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

    if (hasChange) {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });
    }
  }, [results, isSuccess, queryClient, t]);

  // Reset tracking when the set of polled accounts changes.
  useEffect(() => {
    lastTxIdsRef.current = new Map();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIds.join(',')]);
};
