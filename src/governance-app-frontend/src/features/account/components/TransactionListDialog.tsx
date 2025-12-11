import {
  AccountIdentifier,
  GetAccountIdentifierTransactionsResponse,
} from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AccountTransactionItem } from '@features/account/components/TransactionItem';

import { QueryStates } from '@components/QueryStates';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { SkeletonLoader } from '@components/SkeletonLoader';
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

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[80vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.common.transactions)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(($) => $.account.transactionListDescription)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isNullish(accountId) ? (
          <div className="flex flex-col gap-2">
            <SkeletonLoader count={3} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
              infiniteQuery={transactions}
              isEmpty={(data) =>
                !data.pages?.length || !data.pages[0].response.transactions.length
              }
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
                </div>
              )}
            </QueryStates>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
