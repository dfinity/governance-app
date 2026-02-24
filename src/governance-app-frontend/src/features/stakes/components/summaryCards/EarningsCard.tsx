import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons } from '@hooks/governance';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';
import {
  isStakingRewardDataError,
  isStakingRewardDataReady,
  MaturityEstimatePeriod,
} from '@utils/staking-rewards';

export function EarningsCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const stakingRewards = useStakingRewards();

  const neurons = neuronsQuery.data?.response ?? [];
  const { totalUnstakedMaturity } = getNeuronsAggregatedData(neurons);

  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);
  const stakingRewardsError = isStakingRewardDataError(stakingRewards);
  const forecastValue = stakingRewardsReady
    ? (stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)
    : null;

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-earnings-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.earnings)}
        </p>
        {neuronsQuery.isLoading ? (
          <>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold text-foreground md:text-2xl">
                {formatNumber(totalUnstakedMaturity)}
              </span>
              <MaturitySymbol />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {stakingRewardsReady && forecastValue !== null ? (
                <p>
                  {t(($) => $.neuron.summary.earningsForecast)}:{' '}
                  {t(($) => $.common.positiveNumber, {
                    value: formatNumber(forecastValue),
                  })}
                </p>
              ) : stakingRewardsError ? (
                <p>—</p>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
