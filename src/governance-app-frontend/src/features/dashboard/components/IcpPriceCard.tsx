import { nonNullish } from '@dfinity/utils';
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

  const change =
    icpPrice?.previousUsd && icpPrice.usd
      ? ((icpPrice.usd - icpPrice.previousUsd) / icpPrice.previousUsd) * 100
      : undefined;

  const isPositive = nonNullish(change) && change >= 0;

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
            {nonNullish(change) && (
              <p
                className={`mt-1 flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                {isPositive ? '+' : ''}
                {formatNumber(change)}% ({t(($) => $.home.icpPrice24h)})
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
