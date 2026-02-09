import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountTransactionItem } from '@features/account/components/TransactionItem';
import { buildTrustedAddresses } from '@features/account/utils/addressPoisoning';

import { MultipleSkeletons } from '@components/MultipleSkeletons';
import { QueryStates } from '@components/QueryStates';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { CertifiedData } from '@typings/queries';

import { useNeuronAccountsIds } from '../hooks/useNeuronAccountsIds';

interface TransactionListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionListDialog({ open, onOpenChange }: TransactionListDialogProps) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const accountId = nonNullish(identity)
    ? AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      })
    : null;

  const transactions = useIcpIndexTransactions();
  const { accountIds: neuronAccountIds } = useNeuronAccountsIds();

  const allTransactions = useMemo(
    () =>
      transactions.data?.pages?.flatMap((page) =>
        page.response.transactions.map((tx) => tx.transaction),
      ) ?? [],
    [transactions.data?.pages],
  );

  const trustedAddresses = useMemo(
    () =>
      nonNullish(accountId)
        ? buildTrustedAddresses(accountId.toHex(), neuronAccountIds, allTransactions)
        : new Set<string>(),
    [accountId, neuronAccountIds, allTransactions],
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.common.transactions)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(($) => $.account.transactionListDescription)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isNullish(accountId) ? (
          <div className="flex flex-col gap-2">
            <MultipleSkeletons count={3} />
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2 lg:pb-0">
            <QueryStates<CertifiedData<IcpIndexDid.GetAccountIdentifierTransactionsResponse>>
              infiniteQuery={transactions}
              isEmpty={(data) => !data.pages?.length || !data.pages[0].response.transactions.length}
              loadingComponent={<MultipleSkeletons count={3} />}
            >
              {(data) => (
                <div className="flex flex-col gap-3">
                  {data.pages?.map((page) =>
                    page.response.transactions.map((tx) => (
                      <AccountTransactionItem
                        certified={page.certified}
                        accountId={accountId.toHex()}
                        key={tx.id}
                        tx={tx}
                        trustedAddresses={trustedAddresses}
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
