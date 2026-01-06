import { nonNullish } from '@dfinity/utils';
import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Trans, useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { MaturitySymbol } from '@components/MaturitySymbol';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { isStakingRewardDataReady, MaturityEstimatePeriod } from '@utils/staking-rewards';
import { useWaveAnimation } from '../hooks/useWaveAnimation';

// @TODO: How do we display errors loading data?
export const ParticipateCard = () => {
  const { t } = useTranslation();

  const { tickerPrices } = useTickerPrices();
  const neuronsQuery = useGovernanceNeurons();
  const balanceQuery = useIcpLedgerAccountBalance();
  const stakingRewards = useStakingRewards();

  // Calculate Total Assets
  const liquidBalance = nonNullish(balanceQuery.data?.response)
    ? bigIntDiv(balanceQuery.data.response, E8Sn, 2)
    : 0;

  const neurons = neuronsQuery.data?.response || [];
  let stakedBalance = 0;
  let maturityBalance = 0;

  if (neuronsQuery.data?.response) {
    neurons.forEach((neuron: NeuronInfo) => {
      stakedBalance += bigIntDiv(getNeuronStakeE8s(neuron), E8Sn, 2);
      maturityBalance += bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn, 2);
    });
  }

  const totalAssets = liquidBalance + stakedBalance + maturityBalance;

  // Prices
  const icpPrice = tickerPrices.data?.get(CANISTER_ID_ICP_LEDGER!);
  const icpPriceUsd = icpPrice ? formatNumber(icpPrice.usd) : undefined;
  const totalAssetsUsd = icpPrice ? formatNumber(totalAssets * icpPrice.usd) : undefined;

  const isLoading = balanceQuery.isLoading || neuronsQuery.isLoading;

  const { canvasRef, containerRef } = useWaveAnimation();

  return (
    <Card
      className="relative overflow-hidden border-none bg-white shadow-sm dark:bg-zinc-900"
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 blur-md"
        role="presentation"
        aria-hidden="true"
      />

      <CardContent className="relative z-10 flex h-full flex-col justify-between px-8 py-2">
        <div className="mt-4 space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            <Trans
              i18nKey={($) => $.home.participateTitle}
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </h2>
          <p className="font-light">{t(($) => $.home.participateSubtitle)}</p>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          {/* Left: Total Value */}
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-wider uppercase">
              {t(($) => $.home.totalValue)}
            </p>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <Skeleton className="h-10 w-36" />
              ) : (
                <span className="text-4xl font-bold text-foreground">
                  {t(($) => $.common.inIcp, { value: formatNumber(totalAssets) })}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              {isLoading || !totalAssetsUsd ? (
                <Skeleton className="h-5 w-14" />
              ) : (
                <span className="text-sm font-semibold">
                  {t(($) => $.account.approxUsd, { value: totalAssetsUsd })}
                </span>
              )}
            </div>
          </div>

          {/* Right: Metrics  */}
          <div className="grid w-full grid-cols-1 gap-3 xs:w-auto xs:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-border/50 bg-white/50 px-4 py-[10px] text-right shadow-sm backdrop-blur-sm xs:col-span-2 dark:bg-zinc-800/50">
              <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.icpUsd)}
              </span>
              <span className="text-lg font-semibold">
                {icpPriceUsd ? `$${icpPriceUsd}` : <Skeleton className="h-7 w-32" />}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-white/50 px-4 py-[10px] text-right shadow-sm backdrop-blur-sm dark:bg-zinc-800/50">
              <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {t(($) => $.home.forecast.oneWeek)}
              </span>
              <span className="flex items-center justify-end gap-1.5 text-lg font-semibold text-emerald-800 dark:text-emerald-400">
                {isStakingRewardDataReady(stakingRewards) ? (
                  `+${formatNumber(stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.WEEK) || 0)} `
                ) : (
                  <Skeleton className="h-7 w-16" />
                )}
                <MaturitySymbol />
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-white/50 px-4 py-[10px] text-right shadow-sm backdrop-blur-sm dark:bg-zinc-800/50">
              <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {t(($) => $.home.forecast.oneYear)}
              </span>
              <span className="flex items-center justify-end gap-1.5 text-lg font-semibold text-emerald-800 dark:text-emerald-400">
                {isStakingRewardDataReady(stakingRewards) ? (
                  `+ ${formatNumber(stakingRewards.rewardEstimates.get(MaturityEstimatePeriod.YEAR) || 0)} `
                ) : (
                  <Skeleton className="h-7 w-16" />
                )}
                <MaturitySymbol />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
