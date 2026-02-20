import { isNullish, nonNullish } from '@dfinity/utils';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import {
  NNS_FINAL_REWARD_RATE,
  NNS_GENESIS_TIMESTAMP_SECONDS,
  NNS_INITIAL_REWARD_RATE,
  SECONDS_IN_EIGHT_YEARS,
} from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { formatNumber } from '@utils/numbers';
import { getPoolReward } from '@utils/staking-rewards';

export const DailyRewardsCard = () => {
  const { t } = useTranslation();
  const { data: metricsData, isLoading } = useGovernanceMetrics();

  const metrics = metricsData?.response;

  const dailyReward = useMemo(() => {
    if (isNullish(metrics?.totalSupplyIcp)) return undefined;

    return getPoolReward({
      genesisTimestampSeconds: NNS_GENESIS_TIMESTAMP_SECONDS,
      totalSupply: Number(metrics.totalSupplyIcp),
      initialRewardRate: NNS_INITIAL_REWARD_RATE,
      finalRewardRate: NNS_FINAL_REWARD_RATE,
      transitionDurationSeconds: SECONDS_IN_EIGHT_YEARS,
      referenceDate: new Date(),
    });
  }, [metrics?.totalSupplyIcp]);

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.dailyRewards)}
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-semibold text-foreground">
            {nonNullish(dailyReward)
              ? formatNumber(dailyReward, { minFraction: 0, maxFraction: 0 })
              : '—'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
