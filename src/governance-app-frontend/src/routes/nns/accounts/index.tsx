import {
  AccountIdentifier,
  GetAccountIdentifierTransactionsResponse,
  TransactionWithId,
} from '@dfinity/ledger-icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ArrowDownToLine, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cx } from '@untitledui/utils/cx';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { QueryStates } from '@components/extra/QueryStates';
import { SimpleCard } from '@components/extra/SimpleCard';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { useIcpIndexTransactions } from '@hooks/canisters/icpIndex/useIcpIndexTransactions';
import useTitle from '@hooks/useTitle';
import { CertifiedData } from '@typings/queries';
import { bigIntDiv } from '@utils/bigInt';
import { requireIdentity } from '@utils/router';

import { GetTokens } from '@/dev/GetTokens';

export const Route = createFileRoute('/nns/accounts/')({
  component: AccountsPage,
  beforeLoad: requireIdentity,
});

function AccountsPage() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.accounts));

  const { identity } = useInternetIdentity();

  // Check if identity is defined: during logout it can be undefined for a brief moment before the router redirects to the homepage.
  const accountId = nonNullish(identity)
    ? AccountIdentifier.fromPrincipal({
        principal: identity?.getPrincipal(),
      })
    : null;

  const transactions = useIcpIndexTransactions();

  if (isNullish(accountId)) return null;

  return (
    <div className="flex flex-col gap-2 text-xl">
      <h2 className="mb-2 text-primary">{t(($) => $.common.accounts)}</h2>

      <div className="flex items-center gap-2">
        <pre className="overflow-hidden rounded bg-amber-50 px-2 py-2 text-sm text-ellipsis text-black">
          {accountId.toHex()}
        </pre>
        <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
          infiniteQuery={transactions}
          isEmpty={(data) => !data.pages?.length}
          loadingComponent={<SkeletonLoader width={100} height={24} />}
        >
          {(data) => (
            <div className="shrink-0 text-sm font-bold">
              {bigIntDiv(data.pages?.[0].response.balance || 0n, E8Sn, 2) +
                ' ' +
                t(($) => $.common.icps)}
            </div>
          )}
        </QueryStates>

        {IS_TESTNET && (
          <div className="ml-auto">
            <GetTokens accountId={accountId} />
          </div>
        )}
      </div>

      <div className="mt-4 mb-2 flex gap-2">{t(($) => $.common.transactions)}</div>
      <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
        infiniteQuery={transactions}
        isEmpty={(data) => !data.pages?.length || !data.pages[0].response.transactions.length}
      >
        {(data) => (
          <div className="flex flex-col gap-2">
            {data.pages?.map((page) =>
              page.response.transactions.map((tx) => (
                <TransactionItem
                  certified={page.certified}
                  accountId={accountId.toHex()}
                  key={tx.id}
                  tx={tx}
                />
              )),
            )}

            {transactions.hasNextPage && (
              <InViewSentinel retrigger={data} callback={transactions.fetchNextPage}>
                <SkeletonLoader count={3} />
              </InViewSentinel>
            )}
          </div>
        )}
      </QueryStates>
    </div>
  );
}

const TransactionItem = ({
  tx,
  accountId,
  certified,
}: {
  tx: TransactionWithId;
  accountId: string;
  certified: boolean;
}) => {
  const { t } = useTranslation();

  const operation = tx.transaction.operation;
  const isSending = 'Transfer' in operation && operation.Transfer.from === accountId;

  // @TODO: Display all the other operations as well.
  return 'Transfer' in operation ? (
    <SimpleCard key={tx.id}>
      <div className="flex items-center gap-2">
        <div
          className={cx('mr-2 rounded p-4 text-black', isSending ? 'bg-red-100' : 'bg-green-100')}
        >
          {isSending ? <ArrowUp /> : <ArrowDownToLine />}
        </div>
        <div className="flex w-full min-w-0 shrink flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <div className="flex gap-0.5">
              <span className="font-bold">{t(($) => $.common.date)}: </span>
              {new Date(
                Number((tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n) / 1_000_000n) ||
                  0,
              ).toLocaleString()}
            </div>

            <CertifiedBadge certified={certified} />
          </div>

          <div className="flex gap-0.5">
            <span className="font-bold">{t(($) => $.common.amount)}: </span>
            {bigIntDiv(operation.Transfer.amount.e8s, E8Sn, 2).toFixed(2)} {t(($) => $.common.icps)}
          </div>

          <div className="flex gap-0.5">
            <span className="w-[42px] font-bold">{t(($) => $.common.from)}: </span>
            <pre className="overflow-hidden text-ellipsis">{operation.Transfer.from}</pre>
          </div>

          <div className="flex gap-0.5 overflow-hidden text-ellipsis">
            <span className="w-[42px] font-bold">{t(($) => $.common.to)}: </span>
            <pre className="overflow-hidden text-ellipsis">{operation.Transfer.to}</pre>
          </div>
        </div>
      </div>
    </SimpleCard>
  ) : null;
};
