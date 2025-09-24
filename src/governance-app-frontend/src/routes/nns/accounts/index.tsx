import { AccountIdentifier, GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8Sn } from '@constants/extra';
import { useIcpIndexTransactions } from '@hooks/canisters/icpIndex/useIcpIndexTransactions';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import useTitle from '@hooks/useTitle';
import { CertifiedData } from '@typings/queries';
import { bigIntDiv } from '@utils/bigInts';
import { requireIdentity } from '@utils/routes';

export const Route = createFileRoute('/nns/accounts/')({
  component: AccountsPage,
  beforeLoad: requireIdentity,
});

function AccountsPage() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.accounts));

  const { identity } = useInternetIdentity();
  const accountId = AccountIdentifier.fromPrincipal({
    principal: identity!.getPrincipal(),
  }).toHex();

  const account = useIcpLedgerAccountBalance();
  const transactions = useIcpIndexTransactions();

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2">{t(($) => $.common.accounts)}</div>

      <div className="flex items-center gap-2">
        <pre className="mt-4 overflow-hidden rounded bg-amber-50 px-2 py-2 text-sm text-ellipsis text-black sm:mt-0">
          {accountId}
        </pre>
        <QueryStates<CertifiedData<bigint>>
          query={account}
          isEmpty={(data) => data.response === undefined}
          loadingComponent={<SkeletonLoader width={100} height={24} />}
        >
          {(data) => (
            <div className="text-sm font-bold">
              {bigIntDiv(data.response, E8Sn, 2) + ' ' + t(($) => $.common.icps)}
            </div>
          )}
        </QueryStates>
      </div>

      <div className="mt-4 mb-2 flex gap-2">{t(($) => $.common.transactions)}</div>
      <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
        infiniteQuery={transactions}
        isEmpty={(data) => !data.pages?.length}
      >
        {(data) => (
          <div className="flex flex-col gap-2">
            {data.pages?.map((page, i) => (
              <div key={i}>
                {page.response.transactions.map((tx) => (
                  <div key={tx.id} className="rounded border border-gray-300 p-2 text-sm">
                    {tx.transaction.memo}
                    <CertifiedBadge certified={page.certified} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </QueryStates>
    </div>
  );
}
