import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';
import {
  isStakingRewardDataError,
  isStakingRewardDataReady,
  MaturityEstimatePeriod,
} from '@utils/staking-rewards';

type EarningsCardProps = {
  neurons: NeuronInfo[];
};

export function EarningsCard({ neurons }: EarningsCardProps) {
  const { t } = useTranslation();

  const stakingRewards = useStakingRewards();

  const { totalMaturity } = getNeuronsAggregatedData(neurons);

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
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-foreground md:text-2xl">
            {formatNumber(totalMaturity)}
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
      </CardContent>
    </Card>
  );
}
