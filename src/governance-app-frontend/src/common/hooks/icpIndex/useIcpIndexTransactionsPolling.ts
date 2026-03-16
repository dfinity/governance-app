import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { isNullish } from '@dfinity/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { isSuspiciousAddress } from '@features/account/utils/addressPoisoning';
import { useMainAccountMetadata } from '@features/accounts/hooks/useMainAccountMetadata';
import { useSubaccountsMetadata } from '@features/accounts/hooks/useSubaccountsMetadata';

import { E8Sn } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';
import { shortenId } from '@utils/id';
import { infoNotification } from '@utils/notification';
import { formatNumber } from '@utils/numbers';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

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
  latestTransaction: IcpIndexDid.TransactionWithId | null;
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
  const addressBook = useAddressBook();
  const accountIds = [
    ...(mainAccount.data ? [mainAccount.data.accountId] : []),
    ...subaccounts.data.map((a) => a.accountId),
  ];

  // accountId -> last seen transaction id per account.
  // undefined = not yet polled, null = polled but no transactions, bigint = latest tx id.
  const lastTransactionsIdsRef = useRef<Map<string, bigint | null>>(new Map());

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
          return { accountId, latestTransaction: response.transactions[0] ?? null };
        }),
      );
    },
    enabled: ready && authenticated && accountIds.length > 0,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isSuccess) return;

    // Trusted set only includes the user's own accounts and address book contacts.
    // Addresses from transaction history (e.g. past recipients) are not included,
    // so poisoning attempts that mimic those addresses won't be caught here.
    const trustedAddresses = new Set([
      ...accountIds,
      ...(addressBook.data?.named_addresses.map((entry) =>
        addressBookGetAddressString(entry.address),
      ) ?? []),
    ]);

    for (const { accountId, latestTransaction } of results) {
      const previous = lastTransactionsIdsRef.current.get(accountId);
      const current = latestTransaction?.id ?? null;
      lastTransactionsIdsRef.current.set(accountId, current);

      // First time seeing this account — store baseline, don't treat as a change.
      if (previous === undefined) continue;
      // No change detected.
      if (current === previous) continue;
      // No transaction available (account has no history).
      if (isNullish(latestTransaction)) continue;

      // New transaction detected —> invalidate certified balance and transactions.
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, accountId],
        })
        .catch(failedRefresh);
      queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS, accountId],
        })
        .catch(failedRefresh);

      const { operation } = latestTransaction.transaction;
      const amount = formatTransferAmount(operation);

      if (amount && isReceivedTransfer(operation, accountId)) {
        const sender = operation.Transfer.from;

        if (isSuspiciousAddress(sender, operation.Transfer.amount.e8s, trustedAddresses)) continue;

        const contactName = addressBook.data?.named_addresses.find(
          (entry) => addressBookGetAddressString(entry.address) === sender,
        )?.name;
        const senderLabel = contactName ?? shortenId(sender, 6);

        infoNotification({
          title: t(($) => $.account.newTransaction),
          description: t(($) => $.account.newTransactionDescription, {
            value: amount,
            sender: senderLabel,
          }),
        });
      }
    }
  }, [results, isSuccess, queryClient, t, accountIds, addressBook.data]);

  // Reset tracking when the set of polled accounts changes.
  useEffect(() => {
    lastTransactionsIdsRef.current = new Map();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIds.join(',')]);
};
