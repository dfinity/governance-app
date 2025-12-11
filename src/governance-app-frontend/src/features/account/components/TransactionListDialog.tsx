import { isNullish, nonNullish } from '@dfinity/utils';
import {
  AccountIdentifier,
  GetAccountIdentifierTransactionsResponse,
} from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InViewSentinel } from '@components/InViewSentinel';
import { QueryStates } from '@components/QueryStates';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { AccountTransactionItem } from '@features/account/components/TransactionItem';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { useIcpIndexTransactionsPolling } from '@hooks/icpIndex/useIcpIndexTransactionsPolling';
import { CertifiedData } from '@typings/queries';

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
  useIcpIndexTransactionsPolling();

  const retriggerSentinel = useMemo(
    () => [transactions.data, transactions.isFetching],
    [transactions.data, transactions.isFetching],
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[80vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.common.transactions)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Description comes here.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isNullish(accountId) ? (
          <div className="flex flex-col gap-2">
            <SkeletonLoader count={3} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
              infiniteQuery={transactions}
              isEmpty={(data) => !data.pages?.length || !data.pages[0].response.transactions.length}
              loadingComponent={<SkeletonLoader count={3} />}
            >
              {(data) => (
                <div className="flex flex-col gap-2">
                  {data.pages?.map((page) =>
                    page.response.transactions.map((tx) => (
                      <AccountTransactionItem
                        certified={page.certified}
                        accountId={accountId.toHex()}
                        key={tx.id}
                        tx={tx}
                      />
                    )),
                  )}

                  {transactions.hasNextPage && (
                    <InViewSentinel
                      retrigger={retriggerSentinel}
                      callback={transactions.fetchNextPage}
                    >
                      <SkeletonLoader count={3} />
                    </InViewSentinel>
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
