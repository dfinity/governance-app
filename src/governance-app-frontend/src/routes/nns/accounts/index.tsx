import { AccountIdentifier } from '@dfinity/ledger-icp';
import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import useTitle from '@hooks/useTitle';
import { bigIntDiv } from '@utils/bigInts';
import { requireIdentity } from '@utils/routes';

export const Route = createFileRoute('/nns/accounts/')({
  component: AccountsPage,
  beforeLoad: requireIdentity,
});

function AccountsPage() {
  const { isLoading, error, data } = useIcpLedgerAccountBalance();
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.accounts));

  const accountId = AccountIdentifier.fromPrincipal({
    principal: identity!.getPrincipal(),
  }).toHex();

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2">{t(($) => $.common.accounts)}</div>

      <div className="flex items-center gap-2">
        <pre className="mt-4 rounded bg-amber-50 px-2 py-2 text-sm sm:mt-0">{accountId}:</pre>
        {isLoading && <SkeletonLoader count={1} height={24} width={120} />}
        <div>
          {error && t(($) => $.common.errorLoadingBalance, { error: error.message })}
          {!isLoading &&
            !error &&
            (!data?.response ? (
              <WarningMessage message={t(($) => $.common.noBalance)} />
            ) : (
              bigIntDiv(data.response, E8Sn, 2) + ' ICPs'
            ))}
        </div>
      </div>
    </div>
  );
}
