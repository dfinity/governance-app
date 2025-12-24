import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { Coins, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApyOptimizationModal } from '@features/stakes/components/ApyOptimizationModal';
import { StakingRatioModal } from '@features/stakes/components/StakingRatioModal';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { QueryStates } from '@components/QueryStates';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { CertifiedData } from '@typings/queries';
import { TokenPrices } from '@typings/tokenPrices';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

export function StakedCard() {
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const { tickerPrices } = useTickerPrices();
  const stakingRewards = useStakingRewards();

  return (
    <Card className="flex-1 gap-3 transition-all duration-300 hover:shadow-[0_0_25px_-5px_rgba(0,0,0,0.25)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.common.staked)}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <QueryStates<CertifiedData<NeuronInfo[]>>
          query={neuronsQuery}
          isEmpty={({ response: neurons }) => neurons.length === 0}
        >
          {({ response: neurons }) => {
            let totalStaked = 0;
            let totalUnstakedMaturity = 0;

            neurons.forEach((neuron) => {
              const stake = bigIntDiv(getNeuronStakeE8s(neuron), E8Sn, 2);
              const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn, 2);
              totalStaked += stake;
              totalUnstakedMaturity += unstakedMaturity;
            });

            return (
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {t(($) => $.common.inIcp, { value: totalStaked })}
                  </div>

                  <QueryStates<TokenPrices>
                    query={tickerPrices}
                    isEmpty={(data) => data.size === 0}
                    loadingComponent={<SkeletonLoader width={50} height={16} />}
                  >
                    {(priceData) => {
                      const icpPrice = priceData.get(CANISTER_ID_ICP_LEDGER!);
                      const usdValue = icpPrice ? (totalStaked * icpPrice.usd).toFixed(2) : '-';
                      return (
                        <p className="text-xs text-muted-foreground">
                          {t(($) => $.account.approxUsd, { value: usdValue })}
                        </p>
                      );
                    }}
                  </QueryStates>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 text-right [&>*]:transition-all [&>*]:duration-300">
                  <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {t(($) => $.home.stakingRatio)}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-xl font-bold">
                      {isStakingRewardDataReady(stakingRewards) ? (
                        <>
                          {(stakingRewards.stakingRatio * 100).toFixed(2)}%
                          {stakingRewards.stakingRatio < 1 && <StakingRatioModal />}
                        </>
                      ) : (
                        <SkeletonLoader width={50} height={24} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {t(($) => $.common.apy)}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-xl font-bold text-green-600">
                      {isStakingRewardDataReady(stakingRewards) ? (
                        <>
                          {(stakingRewards.apy.cur * 100).toFixed(2)}%
                          {stakingRewards.apy.cur < stakingRewards.apy.max && (
                            <ApyOptimizationModal />
                          )}
                        </>
                      ) : (
                        <SkeletonLoader width={50} height={24} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {t(($) => $.home.unstakedMaturity)}
                    </p>
                    <p className="flex items-center justify-end gap-2 text-xl font-bold">
                      {totalUnstakedMaturity.toFixed(2)} <MaturitySymbol />
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-md bg-muted p-3 hover:bg-gray-200 dark:hover:bg-zinc-700">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {t(($) => $.home.disbursed)}
                    </p>
                    <p className="text-xl font-bold">
                      {/* @TODO: add disbursed amount */}
                      {t(($) => $.common.inIcp, { value: 0.0 })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button size="lg" className="flex-1 capitalize" asChild>
                    <Link to="/stakes">
                      <TrendingUp />
                      {t(($) => $.common.stakeMore)}
                    </Link>
                  </Button>

                  <Button size="lg" variant="outline" className="flex-1" disabled>
                    <Coins /> {t(($) => $.common.withdraw)}
                  </Button>
                </div>
              </div>
            );
          }}
        </QueryStates>
      </CardContent>
    </Card>
  );
}
