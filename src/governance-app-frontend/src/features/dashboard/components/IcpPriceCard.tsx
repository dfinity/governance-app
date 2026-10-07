import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { TickerPricesSource, useIcpRateHistory, useTickerPrices } from '@hooks/tickers';
import { formatNumber, formatPercentage } from '@utils/numbers';

import { IcpPriceSparkline } from './IcpPriceSparkline';

const trendColor = (isPositive: boolean) =>
  isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';

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

  const historyPoints = historyQuery.data ?? [];
  const isHistoryLoading = hasHistorySource && historyQuery.isLoading;
  const showChart = hasHistorySource && historyPoints.length >= 2;
  const isChartPositive =
    showChart && historyPoints[historyPoints.length - 1].usd >= historyPoints[0].usd;

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.icpPrice)}
        </p>
        <div className="flex items-end gap-4">
          <div className="shrink-0">
            {tickersQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold text-foreground">
                {icpPriceUsd ? `$${icpPriceUsd}` : '—'}
              </p>
            )}
            {/* The row keeps its height with or without a change, so the card does
                not shrink when the skeleton leaves. */}
            <div className="mt-1 min-h-5">
              {tickersQuery.isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                nonNullish(change) && (
                  <p
                    className={`flex items-center gap-1 text-sm font-medium ${trendColor(isPositive)}`}
                  >
                    <span>{isPositive ? '▲' : '▼'}</span>
                    {formatPercentage(Math.abs(change))} ({t(($) => $.home.icpPrice24h)})
                  </p>
                )
              )}
            </div>
          </div>
          {isHistoryLoading ? (
            <Skeleton className="h-13 min-w-0 flex-1" />
          ) : (
            showChart && (
              <IcpPriceSparkline
                points={historyPoints}
                label={t(($) => $.home.icpPrice24hChart)}
                className={`min-w-0 flex-1 ${trendColor(isChartPositive)}`}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};
