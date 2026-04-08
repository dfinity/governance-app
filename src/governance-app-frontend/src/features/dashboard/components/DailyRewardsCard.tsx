import { isNullish, nonNullish } from '@dfinity/utils';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedNumber } from '@components/AnimatedNumber';
import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import {
  NNS_FINAL_REWARD_RATE,
  NNS_GENESIS_TIMESTAMP_SECONDS,
  NNS_INITIAL_REWARD_RATE,
  SECONDS_IN_EIGHT_YEARS,
} from '@constants/extra';
import { useGovernanceLatestRewardEvent, useGovernanceMetrics } from '@hooks/governance';
import { secondsToDate } from '@utils/date';
import { getPoolReward } from '@utils/staking-rewards';

export const DailyRewardsCard = () => {
  const { t } = useTranslation();
  const { data: metricsData, isLoading } = useGovernanceMetrics();
  const { data: rewardEventData, isLoading: isRewardEventLoading } =
    useGovernanceLatestRewardEvent();

  const metrics = metricsData?.response;
  const lastRewardTimestamp = rewardEventData?.response?.actual_timestamp_seconds;

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
            {nonNullish(dailyReward) ? (
              <AnimatedNumber
                value={dailyReward}
                formatOptions={{ minFraction: 0, maxFraction: 0 }}
              />
            ) : (
              '—'
            )}
          </p>
        )}
        {isRewardEventLoading ? (
          <Skeleton className="mt-1 h-4 w-32" />
        ) : (
          nonNullish(lastRewardTimestamp) && (
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {t(($) => $.home.lastRewardEvent, {
                date: secondsToDate(Number(lastRewardTimestamp)),
              })}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
};
