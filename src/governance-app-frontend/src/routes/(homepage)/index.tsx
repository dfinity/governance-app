import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { NotAvailableBadge } from '@components/badges/certified/NotAvailableBadge';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { TokenPrices, useIcpSwapPrices } from '@hooks/externalServices/useIcpSwapPrices';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const prices = useIcpSwapPrices();
  const { t } = useTranslation();

  return (
    <div className="text-xl">
      <div data-testid="login-test-principal" data-snapshot-mask>
        {identity
          ? t(($) => $.home.yourPrincipal, {
              principal: identity.getPrincipal().toString(),
            })
          : t(($) => $.common.loginWithII)}
      </div>

      <div data-testid="login-test-icp-price">
        {t(($) => $.common.icpPrice)}:{' '}
        <QueryStates<TokenPrices>
          query={prices}
          isEmpty={(data) => data.size === 0}
          loadingComponent={<SkeletonLoader width={50} height={20} />}
        >
          {(data) => {
            const icpPrice = data.get(CANISTER_ID_ICP_LEDGER!);
            return icpPrice ? icpPrice.usd.toFixed(2) + '$' : <NotAvailableBadge />;
          }}
        </QueryStates>
      </div>
    </div>
  );
}
