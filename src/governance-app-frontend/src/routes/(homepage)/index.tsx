import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { TokenPrices, useIcpSwapPrices } from '@hooks/externalServices/useIcpSwapPrices';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();

  const prices = useIcpSwapPrices();

  return (
    <div className="text-xl" data-testid="login-test" data-snapshot-mask>
      {identity
        ? t(($) => $.home.yourPrincipal, {
            principal: identity.getPrincipal().toString(),
          })
        : t(($) => $.common.loginWithII)}

      <QueryStates<TokenPrices>
        query={prices}
        isEmpty={(data) => !Object.values(data).length}
        loadingComponent={<SkeletonLoader width={100} height={24} />}
      >
        {(data) => (
          <div>
            {t(($) => $.common.ICPtoUSD)}: {data[CANISTER_ID_ICP_LEDGER!]?.usd}$
          </div>
        )}
      </QueryStates>
    </div>
  );
}
