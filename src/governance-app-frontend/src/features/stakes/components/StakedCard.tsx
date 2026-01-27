import { Link } from '@tanstack/react-router';
import { Coins, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApyOptimizationModal } from '@features/stakes/components/ApyOptimizationModal';
import { StakingRatioModal } from '@features/stakes/components/StakingRatioModal';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { useApyColor } from '@hooks/useApyColor';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { warningNotification } from '@utils/notification';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady, MaturityEstimatePeriod } from '@utils/staking-rewards';

export function StakedCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const balanceQuery = useIcpLedgerAccountBalance();
  const { tickerPrices: tickersQuery } = useTickerPrices();
  const stakingRewards = useStakingRewards();
  const apyColor = useApyColor(
    isStakingRewardDataReady(stakingRewards) ? stakingRewards.apy.cur : 0,
  );

  const handleStakeMoreClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const balanceICP = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn);

    if (balanceICP <= 0) {
      e.preventDefault();
      warningNotification({
        description: t(($) => $.neuron.stakeNeuron.errors.zeroBalance),
      });
    }
  };

  const [totalStaked, totalUnstakedMaturity] = neuronsQuery.data?.response?.reduce(
    (acc, neuron) => {
      const stake = bigIntDiv(getNeuronStakeE8s(neuron), E8Sn);
      const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);
      return [acc[0] + stake, acc[1] + unstakedMaturity];
    },
    [0, 0],
  ) ?? [0, 0];

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(totalStaked * icpPrice.usd) : '-';

  return (
    <Card className="flex-1 gap-3 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.common.staked)}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {neuronsQuery.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">
                {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
              </p>
            )}

            {balanceQuery.isLoading || neuronsQuery.isLoading || tickersQuery.isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(($) => $.account.approxUsd, { value: usdValue })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-right [&>*]:transition-all [&>*]:duration-300">
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t(($) => $.home.stakingRatio)}
              </p>
              <div className="flex items-center justify-end gap-2">
                {isStakingRewardDataReady(stakingRewards) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">
                      {formatPercentage(stakingRewards.stakingRatio)}
                    </span>
                    {stakingRewards.stakingRatio < 1 && <StakingRatioModal />}
                  </div>
                ) : (
                  <Skeleton className="h-7 w-28" />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t(($) => $.common.apy)}
              </p>
              <div className="flex items-center justify-end gap-2">
                {isStakingRewardDataReady(stakingRewards) && apyColor.ready ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold" style={{ color: apyColor.textColor }}>
                      {formatPercentage(stakingRewards.apy.cur)}
                    </span>
                    {stakingRewards.apy.cur < stakingRewards.apy.max && <ApyOptimizationModal />}
                  </div>
                ) : (
                  <Skeleton className="h-7 w-28" />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t(($) => $.home.unstakedMaturity)}
              </p>
              <div className="flex items-center justify-end gap-2">
                {neuronsQuery.isLoading ? (
                  <Skeleton className="h-7 w-13" />
                ) : (
                  <span className="text-xl font-bold">{formatNumber(totalUnstakedMaturity)}</span>
                )}
                <MaturitySymbol />
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t(($) => $.home.forecast.oneYear)}
              </p>
              <div className="flex items-center justify-end gap-2">
                {isStakingRewardDataReady(stakingRewards) ? (
                  <span className="text-lg font-bold">
                    {t(($) => $.common.positiveNumber, {
                      value: formatNumber(
                        stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.YEAR) || 0,
                      ),
                    })}
                  </span>
                ) : (
                  <Skeleton className="h-7 w-13" />
                )}
                <MaturitySymbol />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="xl" className="flex-1 capitalize" asChild onClick={handleStakeMoreClick}>
              <Link to="/stakes" search={{ openWizard: true }}>
                <TrendingUp />
                {t(($) => $.common.stakeMore)}
              </Link>
            </Button>

            <Button size="xl" variant="outline" className="flex-1" disabled>
              <Coins /> {t(($) => $.common.withdraw)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
