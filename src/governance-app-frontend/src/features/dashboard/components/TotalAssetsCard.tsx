import { useTranslation } from 'react-i18next';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { StakingRatioModal } from '@features/stakes/components/StakingRatioModal';

import { Card, CardContent, CardHeader } from '@components/Card';
import { type ChartConfig, ChartContainer } from '@components/Chart';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useGovernanceNeurons } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

const chartConfig = {
  stakingRatio: {
    label: 'Staking ratio',
    theme: {
      light: '#0057FF',
      dark: '#4D8AFF',
    },
  },
} satisfies ChartConfig;

export const TotalAssetsCard = () => {
  const { t } = useTranslation();

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const neuronsQuery = useGovernanceNeurons();
  const { isLoading: isLoadingAccounts, totalBalanceIcp } = useAccounts();
  const stakingRewards = useStakingRewards();

  const liquidBalance = totalBalanceIcp ?? 0;

  const { totalStakedAfterFees: stakedBalance } = getNeuronsAggregatedData(
    neuronsQuery.data?.response,
  );

  const totalAssets = liquidBalance + stakedBalance;

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const totalAssetsUsd = icpPrice ? formatNumber(totalAssets * icpPrice.usd) : undefined;

  const isLoading = isLoadingAccounts || neuronsQuery.isLoading;
  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);

  const stakingRatioPercent = stakingRewardsReady ? stakingRewards.stakingRatio * 100 : 0;

  const chartData = [
    { name: 'staking', value: stakingRatioPercent, fill: 'var(--color-stakingRatio)' },
  ];

  return (
    <Card className="pt-4 pb-6">
      <CardHeader className="flex flex-col items-center gap-0">
        <div className="flex min-h-9 items-center">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">
            {t(($) => $.home.totalAssets)}
          </p>
        </div>

        <div>
          {isLoading || tickersQuery.isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">${totalAssetsUsd ?? '—'}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">
        <Separator />
        <div className="relative mx-auto w-full">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-48 [&_.recharts-surface]:overflow-visible"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="80%"
              outerRadius="100%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={10} />
            </RadialBarChart>
          </ChartContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-1">
              {stakingRewardsReady ? (
                <span className="text-2xl font-semibold tracking-wide text-foreground">
                  {formatPercentage(stakingRewards.stakingRatio, {
                    minFraction: 0,
                    maxFraction: 0,
                  })}
                </span>
              ) : (
                <div className="flex items-center justify-center">
                  <Skeleton className="h-8 w-20" />
                </div>
              )}
              {liquidBalance !== 0 && <StakingRatioModal />}
            </div>
            <span className="text-sm text-muted-foreground">{t(($) => $.home.stakingRatio)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
