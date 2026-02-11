import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { useTvlValue } from '@features/login/hooks/useTvlValue';

import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

export const TotalStakedCard = () => {
  const { t } = useTranslation();
  const { tvl, isLoading: isTvlLoading } = useTvlValue();
  const { data: metricsData, isLoading: isMetricsLoading } = useGovernanceMetrics();

  const metrics = metricsData?.response;

  const totalLockedIcp = metrics?.totalLockedE8s
    ? bigIntDiv(metrics.totalLockedE8s, E8Sn)
    : undefined;

  const stakedPercentage =
    nonNullish(totalLockedIcp) && metrics?.totalSupplyIcp
      ? (totalLockedIcp / Number(metrics.totalSupplyIcp)) * 100
      : undefined;

  const isLoading = isTvlLoading || isMetricsLoading;

  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4 shadow-sm dark:bg-zinc-800/50">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(($) => $.home.totalStaked)}
      </p>
      {isLoading ? (
        <>
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-28" />
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground">
            {nonNullish(tvl) ? `$${formatNumber(tvl, { minFraction: 0, maxFraction: 0 })}` : '—'}
          </p>
          {nonNullish(stakedPercentage) && (
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {t(($) => $.home.ofTotalSupply, {
                value: formatNumber(stakedPercentage, { minFraction: 1, maxFraction: 1 }),
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
};
