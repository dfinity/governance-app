import { nonNullish } from '@dfinity/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { SECONDS_IN_DAY } from '@constants/extra';
import {
  type IcpRatePoint,
  TickerPricesSource,
  useIcpPrice,
  useIcpRateHistory,
  useIcpRateMonthHistory,
  useTickerPrices,
} from '@hooks/tickers';
import { formatPercentage } from '@utils/numbers';

import { IcpPriceSparkline } from './IcpPriceSparkline';

enum IcpPriceRange {
  Day = '24h',
  Week = '7d',
  Month = '30d',
}

const RANGE_SECONDS = {
  [IcpPriceRange.Week]: 7 * SECONDS_IN_DAY,
  [IcpPriceRange.Month]: 30 * SECONDS_IN_DAY,
};
// The backend keeps one rate every two hours, so this allows for one missing rate.
const BASELINE_TOLERANCE_SECONDS = 4 * 60 * 60;

const getLastWeekPoints = (points: IcpRatePoint[]) => {
  const newestTimestampSeconds = points[points.length - 1]?.timestampSeconds ?? 0;
  const oldestTimestampSeconds = newestTimestampSeconds - RANGE_SECONDS[IcpPriceRange.Week];
  return points.filter(({ timestampSeconds }) => timestampSeconds >= oldestTimestampSeconds);
};

// Returns `undefined` if the history is shorter than the range, because the change would then
// cover a shorter period than its label says.
const getBaselineUsd = (points: IcpRatePoint[], rangeSeconds: number) => {
  if (points.length < 2) return undefined;

  const historySeconds = points[points.length - 1].timestampSeconds - points[0].timestampSeconds;
  return historySeconds >= rangeSeconds - BASELINE_TOLERANCE_SECONDS ? points[0].usd : undefined;
};

const trendColor = (isPositive: boolean) =>
  isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';

export const IcpPriceCard = () => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery, tickerPricesSource } = useTickerPrices();
  const { icpPrice: icpPriceFiat, toFiat, formatFiat, isLoading } = useIcpPrice();
  // Only the backend (XRC) source keeps a price history.
  const hasHistorySource = tickerPricesSource === TickerPricesSource.XRC;
  const [selectedRange, setSelectedRange] = useState(IcpPriceRange.Day);
  // Without a history source, the card has no picker and only the 24h change is available.
  const range = hasHistorySource ? selectedRange : IcpPriceRange.Day;
  const isDayRange = range === IcpPriceRange.Day;
  const dayHistoryQuery = useIcpRateHistory({ enabled: hasHistorySource });
  const monthHistoryQuery = useIcpRateMonthHistory({ enabled: !isDayRange });
  const historyQuery = isDayRange ? dayHistoryQuery : monthHistoryQuery;

  const rangeLabels = {
    [IcpPriceRange.Day]: t(($) => $.home.icpPrice24h),
    [IcpPriceRange.Week]: t(($) => $.home.icpPrice7d),
    [IcpPriceRange.Month]: t(($) => $.home.icpPrice30d),
  };
  const chartLabels = {
    [IcpPriceRange.Day]: t(($) => $.home.icpPrice24hChart),
    [IcpPriceRange.Week]: t(($) => $.home.icpPrice7dChart),
    [IcpPriceRange.Month]: t(($) => $.home.icpPrice30dChart),
  };

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const historyData = historyQuery.data ?? [];
  const historyPoints = range === IcpPriceRange.Week ? getLastWeekPoints(historyData) : historyData;

  const previousUsd =
    range === IcpPriceRange.Day
      ? icpPrice?.previousUsd
      : getBaselineUsd(historyPoints, RANGE_SECONDS[range]);
  // One exchange rate converts both prices, so the change is the same in each currency.
  const change =
    previousUsd && icpPrice?.usd ? (icpPrice.usd - previousUsd) / previousUsd : undefined;

  const isPositive = nonNullish(change) && change >= 0;

  // The chart also waits for the price, so that its tooltip shows the picked currency.
  const isChartLoading = hasHistorySource && (historyQuery.isLoading || isLoading);
  const showChart = hasHistorySource && historyPoints.length >= 2;
  // The month history ends at the last two-hour slot, so its trend uses the live price.
  const isChartPositive =
    showChart &&
    (!isDayRange && nonNullish(change)
      ? isPositive
      : historyPoints[historyPoints.length - 1].usd >= historyPoints[0].usd);

  return (
    <Card className="gap-0 overflow-hidden py-4">
      <CardContent>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(($) => $.home.icpPrice)}
          </p>
          {hasHistorySource && (
            // The negative margins keep the 24px buttons inside the height of the label.
            <ToggleGroup
              type="single"
              spacing={0.5}
              size="sm"
              value={range}
              onValueChange={(value: IcpPriceRange) => {
                if (value) setSelectedRange(value);
              }}
              aria-label={t(($) => $.home.icpPriceRange)}
              className="-my-1 -mr-1.5"
            >
              {Object.values(IcpPriceRange).map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={chartLabels[value]}
                  // In dark mode, `bg-muted` is the same color as the card.
                  className="h-6 min-w-0 px-1.5 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
                >
                  {rangeLabels[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-2xl font-semibold text-foreground">
              {nonNullish(icpPriceFiat) ? formatFiat(icpPriceFiat) : '—'}
            </p>
            {nonNullish(change) && (
              <p
                className={`flex items-center gap-1 text-sm font-medium ${trendColor(isPositive)}`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                {formatPercentage(Math.abs(change))} ({rangeLabels[range]})
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
        {isChartLoading ? (
          <Skeleton className="mt-3 flex-1 rounded-none" />
        ) : (
          showChart && (
            // `min-h-0` lets the chart shrink with the card.
            // Without it, the drawn SVG holds the old height.
            <IcpPriceSparkline
              points={historyPoints}
              label={chartLabels[range]}
              formatPrice={(usd) => formatFiat(toFiat(usd))}
              className={`min-h-0 flex-1 ${trendColor(isChartPositive)}`}
            />
          )
        )}
      </div>
    </Card>
  );
};
