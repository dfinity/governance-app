import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AccountTransactionItem } from '@features/account/components/TransactionItem';
import { useNeuronAccountsIds } from '@features/account/hooks/useNeuronAccountsIds';
import { buildTrustedAddresses } from '@features/account/utils/addressPoisoning';
import { useAccounts } from '@features/accounts/hooks/useAccounts';

import { MultipleSkeletons } from '@components/MultipleSkeletons';
import { QueryStates } from '@components/QueryStates';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { CertifiedData } from '@typings/queries';
import { addressBookGetAddressString } from '@utils/addressBook';

interface TransactionListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
}

export function TransactionListDialog({
  open,
  onOpenChange,
  accountId,
}: TransactionListDialogProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const accountIdHex =
    accountId ??
    (nonNullish(identity)
      ? AccountIdentifier.fromPrincipal({ principal: identity.getPrincipal() }).toHex()
      : null);

  const transactions = useIcpIndexTransactions(accountId);
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();

  const allTransactions =
    transactions.data?.pages?.flatMap((page) =>
      page.response.transactions.map((tx) => tx.transaction),
    ) ?? [];

  // NOTE: Trusted addresses are built from the currently fetched pages only.
  // Detection improves as the user scrolls and more pages are loaded, but
  // poisoning attempts that mimic recipients from unfetched older history
  // won't be flagged until those pages are loaded.
  const trustedAddresses = nonNullish(accountIdHex)
    ? buildTrustedAddresses(accountIdHex, neuronAccountIds, allTransactions)
    : new Set<string>();

  const { data: accountsData } = useAccounts();
  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];

  const addressNameMap = new Map<string, string>();
  for (const account of accountsData?.accounts ?? []) {
    addressNameMap.set(account.accountId, account.name);
  }
  for (const entry of addressBookEntries) {
    addressNameMap.set(addressBookGetAddressString(entry.address), entry.name);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.common.transactions)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(($) => $.account.transactionListDescription)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isNullish(accountIdHex) ? (
          <div className="flex flex-col gap-2">
            <MultipleSkeletons count={3} />
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2 lg:pb-0">
            <QueryStates<CertifiedData<IcpIndexDid.GetAccountIdentifierTransactionsResponse>>
              infiniteQuery={transactions}
              isEmpty={(data) => !data.pages?.length || !data.pages[0].response.transactions.length}
              loadingComponent={<MultipleSkeletons count={3} />}
              emptyComponent={
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t(($) => $.account.noTransactions)}
                </p>
              }
            >
              {(data) => (
                <div className="flex flex-col gap-3">
                  {data.pages?.map((page) =>
                    page.response.transactions.map((tx) => (
                      <AccountTransactionItem
                        certified={page.certified}
                        accountId={accountIdHex}
                        key={tx.id}
                        tx={tx}
                        trustedAddresses={trustedAddresses}
                        addressNameMap={addressNameMap}
                      />
                    )),
                  )}
                </div>
              )}
            </QueryStates>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
