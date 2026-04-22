import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

export const MaxApyCard = () => {
  const { t } = useTranslation();
  const stakingRewards = useStakingRewards();

  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_SECONDS].autoStake.locked,
      )
    : undefined;

  const isLoading = !isStakingRewardDataReady(stakingRewards) && !('error' in stakingRewards);

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.maxApy)}
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold text-foreground">{maxApy ?? '—'}</p>
        )}
      </CardContent>
    </Card>
  );
};
