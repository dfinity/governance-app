import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { getLockedSupplyBreakdown } from '@features/dashboard/utils/lockedSupply';

import { AnimatedNumber } from '@components/AnimatedNumber';
import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { useTvlValue } from '@hooks/useTvlValue';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { LockedSupplyBar } from './LockedSupplyBar';

export const TotalStakedCard = () => {
  const { t } = useTranslation();
  const { tvl, formatTvl, isLoading: isTvlLoading } = useTvlValue();
  const { data: metricsData, isLoading: isMetricsLoading } = useGovernanceMetrics();

  const metrics = metricsData?.response;

  const totalLockedIcp = nonNullish(metrics?.totalLockedE8s)
    ? bigIntDiv(metrics.totalLockedE8s, E8Sn)
    : undefined;

  const stakedPercentage =
    nonNullish(totalLockedIcp) && nonNullish(metrics?.totalSupplyIcp)
      ? (totalLockedIcp / Number(metrics.totalSupplyIcp)) * 100
      : undefined;

  const breakdown = nonNullish(metrics) ? getLockedSupplyBreakdown(metrics) : undefined;

  return (
    <Card className="gap-3 py-4">
      <CardContent className="@container">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.totalStaked)}
        </p>
        {isTvlLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          // The line has a fixed height, so the percentage wraps out of sight when it does not
          // fit next to the value. Below 11rem the value alone does not fit, so the line grows.
          <div className="flex h-8 flex-wrap items-baseline gap-x-2 overflow-y-clip @max-[11rem]:h-auto">
            <p className="text-2xl font-semibold text-foreground @max-[11rem]:wrap-anywhere">
              {nonNullish(tvl) ? (
                // The hidden final value sizes the slot, so the percentage does not move while
                // the number counts up.
                <span className="inline-grid">
                  <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                    {formatTvl(tvl)}
                  </span>
                  <AnimatedNumber
                    value={tvl}
                    formatter={formatTvl}
                    className="col-start-1 row-start-1"
                  />
                </span>
              ) : (
                '—'
              )}
            </p>
            {nonNullish(stakedPercentage) && (
              <p className="text-sm font-normal text-muted-foreground">
                {t(($) => $.home.ofSupply, {
                  value: formatNumber(stakedPercentage, { minFraction: 1, maxFraction: 1 }),
                })}
              </p>
            )}
          </div>
        )}
        <div className="mt-1 min-h-5">
          {isMetricsLoading ? (
            <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
          ) : (
            nonNullish(breakdown) && <LockedSupplyBar breakdown={breakdown} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
