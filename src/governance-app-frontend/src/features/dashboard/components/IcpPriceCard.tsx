import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { TickerPricesSource, useIcpRateHistory, useTickerPrices } from '@hooks/tickers';
import { formatNumber, formatPercentage } from '@utils/numbers';

import { IcpPriceSparkline } from './IcpPriceSparkline';

export const IcpPriceCard = () => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery, tickerPricesSource } = useTickerPrices();
  // Only the backend (XRC) source keeps a price history.
  const hasHistorySource = tickerPricesSource === TickerPricesSource.XRC;
  const historyQuery = useIcpRateHistory({ enabled: hasHistorySource });

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const icpPriceUsd = icpPrice ? formatNumber(icpPrice.usd) : undefined;

  const change =
    icpPrice?.previousUsd && icpPrice.usd
      ? (icpPrice.usd - icpPrice.previousUsd) / icpPrice.previousUsd
      : undefined;

  const isPositive = nonNullish(change) && change >= 0;
  const trendColor = isPositive
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-red-700 dark:text-red-400';

  const historyPoints = historyQuery.data ?? [];
  const isLoading = tickersQuery.isLoading || (hasHistorySource && historyQuery.isLoading);
  const showChart = hasHistorySource && nonNullish(change) && historyPoints.length >= 2;

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.icpPrice)}
        </p>
        {isLoading ? (
          <div className="flex items-end gap-4">
            <div>
              <Skeleton className="mb-2 h-8 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            {hasHistorySource && <Skeleton className="h-13 min-w-0 flex-1" />}
          </div>
        ) : (
          <div className="flex items-end gap-4">
            <div className="shrink-0">
              <p className="text-2xl font-semibold text-foreground">
                {icpPriceUsd ? `$${icpPriceUsd}` : '—'}
              </p>
              {nonNullish(change) && (
                <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                  <span>{isPositive ? '▲' : '▼'}</span>
                  {formatPercentage(Math.abs(change))} ({t(($) => $.home.icpPrice24h)})
                </p>
              )}
            </div>
            {showChart && (
              <IcpPriceSparkline
                points={historyPoints}
                label={t(($) => $.home.icpPrice24hChart)}
                className={`min-w-0 flex-1 ${trendColor}`}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
