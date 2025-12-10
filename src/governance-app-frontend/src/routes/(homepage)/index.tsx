import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { NotAvailableBadge } from '@components/NotAvailableBadge';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useTickerPrices } from '@hooks/externalServices/useTickerPrices';
import { TokenPrices } from '@typings/tokenPrices';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const { tickerPrices } = useTickerPrices();
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
          query={tickerPrices}
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
