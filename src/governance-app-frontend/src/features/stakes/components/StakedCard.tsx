import { Link } from '@tanstack/react-router';
import { Coins, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApyOptimizationModal } from '@features/stakes/components/ApyOptimizationModal';
import { DisburseModal } from '@features/stakes/components/DisburseModal';
import { DisburseActionType, getDisburseAction } from '@features/stakes/utils/getDisburseAction';

import { AnimatedNumber } from '@components/AnimatedNumber';
import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader } from '@components/Card';
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
import { getNeuronsAggregatedData } from '@utils/neuron';
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

  const handleStakeMoreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const balanceICP = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn);

    if (balanceICP <= 0) {
      e.preventDefault();
      warningNotification({
        description: t(($) => $.neuron.stakeNeuron.errors.zeroBalance),
      });
    }
  };

  const neurons = neuronsQuery.data?.response ?? [];
  const neuronCount = neurons.length;

  const { totalStakedAfterFees: totalStaked, totalMaturity } = getNeuronsAggregatedData(neurons);

  const disburseAction = getDisburseAction(neurons);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(totalStaked * icpPrice.usd) : '-';

  const stakingRewardsReady = isStakingRewardDataReady(stakingRewards);

  return (
    <Card className="h-full pt-4 pb-6" data-testid="staked-card">
      <CardHeader className="flex flex-col gap-0">
        <div className="flex min-h-9 w-full items-center justify-between">
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-sm tracking-wide text-muted-foreground uppercase">
              <span className="sm:hidden">{t(($) => $.common.stakedShort)}</span>
              <span className="hidden sm:inline">{t(($) => $.common.staked)}</span>
            </p>
            {neuronsQuery.isLoading ? (
              <Skeleton className="size-5 rounded-full" />
            ) : (
              <Badge variant="outline">{neuronCount}</Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="sr-only sm:not-sr-only sm:text-xs sm:font-medium sm:tracking-wide sm:text-muted-foreground">
              {t(($) => $.home.yourApy)}
            </span>

            {stakingRewardsReady && apyColor.ready ? (
              <span className="flex items-center">
                <span className="text-lg font-bold" style={{ color: apyColor.textColor }}>
                  {formatPercentage(stakingRewards.apy.cur)}
                </span>
                {stakingRewards.apy.cur < stakingRewards.apy.max && <ApyOptimizationModal />}
              </span>
            ) : (
              <Skeleton className="h-5 w-16" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {neuronsQuery.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-2xl font-semibold">
              {t(($) => $.common.inIcp, { value: formatNumber(totalStaked) })}
            </p>
          )}

          {neuronsQuery.isLoading || tickersQuery.isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(($) => $.account.approxUsd, { value: usdValue })}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <div className="mt-auto grid grid-cols-2 gap-4 text-right">
          <div className="flex flex-col gap-1 rounded-lg bg-gradient-to-br from-[#2563EB]/8 to-[#F97316]/8 p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(($) => $.home.maturity)}
            </p>
            <div className="flex items-center justify-end gap-1.5">
              {neuronsQuery.isLoading ? (
                <Skeleton className="h-7 w-13" />
              ) : (
                <span className="text-xl font-bold">{formatNumber(totalMaturity)}</span>
              )}
              <MaturitySymbol />
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-lg bg-gradient-to-br from-[#2563EB]/8 to-[#F97316]/8 p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(($) => $.home.forecast.oneYear)}
            </p>
            <div className="flex items-center justify-end gap-1.5">
              {stakingRewardsReady ? (
                <AnimatedNumber
                  value={stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.YEAR) || 0}
                  prefix="+"
                  formatOptions={{ minFraction: 2, maxFraction: 2 }}
                  className="text-xl font-bold"
                />
              ) : (
                <Skeleton className="h-7 w-13" />
              )}
              <MaturitySymbol />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button
            size="xl"
            variant="outline"
            className="flex-1"
            asChild
            disabled={balanceQuery.isLoading}
          >
            <Link to="/neurons" search={{ openWizard: true }} onClick={handleStakeMoreClick}>
              <TrendingUp aria-hidden="true" />
              {t(($) => $.common.stakeIcp)}
            </Link>
          </Button>

          {disburseAction.type === DisburseActionType.Choose ? (
            <Button
              size="xl"
              variant="outline"
              className="flex-1"
              disabled={neuronsQuery.isLoading}
              onClick={() => setDisburseModalOpen(true)}
            >
              <Coins aria-hidden="true" />
              {t(($) => $.common.disburse)}
            </Button>
          ) : (
            <Button
              size="xl"
              variant="outline"
              className="flex-1"
              asChild={disburseAction.type === DisburseActionType.Navigate}
              disabled={
                neuronsQuery.isLoading || disburseAction.type === DisburseActionType.Disabled
              }
            >
              {disburseAction.type === DisburseActionType.Navigate ? (
                <Link to="/neurons" search={disburseAction.search}>
                  <Coins aria-hidden="true" />
                  {t(($) => $.common.disburse)}
                </Link>
              ) : (
                <>
                  <Coins aria-hidden="true" />
                  {t(($) => $.common.disburse)}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>

      {disburseAction.type === DisburseActionType.Choose && (
        <DisburseModal
          neurons={disburseAction.neurons}
          isOpen={disburseModalOpen}
          onOpenChange={setDisburseModalOpen}
        />
      )}
    </Card>
  );
}
