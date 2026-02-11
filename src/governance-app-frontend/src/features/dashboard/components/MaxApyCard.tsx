import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { Skeleton } from '@components/Skeleton';

export const MaxApyCard = () => {
  const stakingRewards = useStakingRewards();

  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : undefined;

  const isLoading = !isStakingRewardDataReady(stakingRewards) && !('error' in stakingRewards);

  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4 shadow-sm dark:bg-zinc-800/50">
      <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        Max APY
      </p>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{maxApy ?? '—'}</p>
      )}
    </div>
  );
};
