import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

import { StakingRatioModal } from '@features/stakes/components/StakingRatioModal';

import { Card, CardContent, CardHeader } from '@components/Card';
import { type ChartConfig, ChartContainer } from '@components/Chart';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

const chartConfig = {
  stakingRatio: {
    label: 'Staking Ratio',
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
  const balanceQuery = useIcpLedgerAccountBalance();
  const stakingRewards = useStakingRewards();

  const liquidBalance = nonNullish(balanceQuery.data?.response)
    ? bigIntDiv(balanceQuery.data.response, E8Sn)
    : 0;

  const { totalStakedAfterFees: stakedBalance, totalUnstakedMaturity: maturityBalance } =
    getNeuronsAggregatedData(neuronsQuery.data?.response);

  const totalAssets = liquidBalance + stakedBalance + maturityBalance;

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const totalAssetsUsd = icpPrice ? formatNumber(totalAssets * icpPrice.usd) : undefined;

  const isLoading = balanceQuery.isLoading || neuronsQuery.isLoading;
  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);

  const stakingRatioPercent = stakingRewardsReady ? stakingRewards.stakingRatio * 100 : 0;

  const chartData = [
    { name: 'staking', value: stakingRatioPercent, fill: 'var(--color-stakingRatio)' },
  ];

  return (
    <Card className="min-w-64 pb-5">
      <CardHeader className="flex flex-col items-center gap-3">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">
          {t(($) => $.home.totalAssets)}
        </p>

        <div>
          {isLoading || tickersQuery.isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">${totalAssetsUsd ?? '—'}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
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
              innerRadius="90%"
              outerRadius="110%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={10} />
            </RadialBarChart>
          </ChartContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-1">
              {stakingRewardsReady ? (
                <span className="text-2xl font-semibold tracking-wide text-foreground">
                  {formatPercentage(stakingRewards.stakingRatio)}
                </span>
              ) : (
                <div className="flex items-center justify-center">
                  <Skeleton className="h-8 w-16" />
                </div>
              )}
              <StakingRatioModal />
            </div>
            <span className="text-sm text-muted-foreground capitalize">
              {t(($) => $.home.stakingRatio)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
