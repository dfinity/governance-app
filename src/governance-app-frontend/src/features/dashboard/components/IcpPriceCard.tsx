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
    <Card className="gap-0 overflow-hidden py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.icpPrice)}
        </p>
        {tickersQuery.isLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-2xl font-semibold text-foreground">
              {icpPriceUsd ? `$${icpPriceUsd}` : '—'}
            </p>
            {nonNullish(change) && (
              <p
                className={`flex items-center gap-1 text-sm font-medium ${trendColor(isPositive)}`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                {formatPercentage(Math.abs(change))} ({t(($) => $.home.icpPrice24h)})
              </p>
            )}
          </div>
        )}
      </CardContent>
      {/* The negative bottom margin cancels the card padding, so the chart touches the
          bottom edge. The negative top margin uses the empty line space under the price.
          The slot keeps its height without a chart, so the card does not shrink when the
          skeleton leaves. */}
      <div className="-mt-1 -mb-4 flex min-h-11 flex-1 flex-col">
        {isHistoryLoading ? (
          <Skeleton className="mt-3 flex-1 rounded-none" />
        ) : (
          showChart && (
            // `min-h-0` lets the chart shrink with the card.
            // Without it, the drawn SVG holds the old height.
            <IcpPriceSparkline
              points={historyPoints}
              label={t(($) => $.home.icpPrice24hChart)}
              className={`min-h-0 flex-1 ${trendColor(isChartPositive)}`}
            />
          )
        )}
      </div>
    </Card>
  );
};
