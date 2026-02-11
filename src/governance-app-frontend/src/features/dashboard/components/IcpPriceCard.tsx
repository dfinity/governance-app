import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useTickerPrices } from '@hooks/tickers';
import { formatNumber } from '@utils/numbers';

export const IcpPriceCard = () => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const icpPriceUsd = icpPrice ? formatNumber(icpPrice.usd) : undefined;

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.icpPrice)}
        </p>
        {tickersQuery.isLoading ? (
          <>
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-foreground">
              {icpPriceUsd ? `$${icpPriceUsd}` : '—'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
