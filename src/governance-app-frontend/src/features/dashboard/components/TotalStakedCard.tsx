import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { AnimatedNumber } from '@components/AnimatedNumber';
import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { useTvlValue } from '@hooks/useTvlValue';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

export const TotalStakedCard = () => {
  const { t } = useTranslation();
  const { tvl, isLoading: isTvlLoading } = useTvlValue();
  const { data: metricsData, isLoading: isMetricsLoading } = useGovernanceMetrics();

  const metrics = metricsData?.response;

  const totalLockedIcp = nonNullish(metrics?.totalLockedE8s)
    ? bigIntDiv(metrics.totalLockedE8s, E8Sn)
    : undefined;

  const stakedPercentage =
    nonNullish(totalLockedIcp) && nonNullish(metrics?.totalSupplyIcp)
      ? (totalLockedIcp / Number(metrics.totalSupplyIcp)) * 100
      : undefined;

  const isLoading = isTvlLoading || isMetricsLoading;

  return (
    <Card className="gap-3 py-4">
      <CardContent>
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
              {nonNullish(tvl) ? (
                <AnimatedNumber
                  value={tvl}
                  prefix="$"
                  formatOptions={{ minFraction: 0, maxFraction: 0 }}
                />
              ) : (
                '—'
              )}
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
      </CardContent>
    </Card>
  );
};
