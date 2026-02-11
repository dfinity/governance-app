import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { useGovernanceLatestRewardEvent } from '@hooks/governance';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

export const DailyRewardsCard = () => {
  const { t } = useTranslation();
  const { data: rewardEventData, isLoading } = useGovernanceLatestRewardEvent();

  const rewardEvent = rewardEventData?.response;
  const distributedIcp = nonNullish(rewardEvent?.distributed_e8s_equivalent)
    ? bigIntDiv(rewardEvent.distributed_e8s_equivalent, E8Sn)
    : undefined;

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
            {nonNullish(distributedIcp)
              ? formatNumber(distributedIcp, { minFraction: 0, maxFraction: 0 })
              : '—'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
