import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { Trans, useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useWaveAnimation } from '../hooks/useWaveAnimation';

export const TotalAssetsCard = () => {
  const { t } = useTranslation();

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const neuronsQuery = useGovernanceNeurons();
  const balanceQuery = useIcpLedgerAccountBalance();

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
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const icpPriceUsd = icpPrice ? formatNumber(icpPrice.usd) : undefined;
  const totalAssetsUsd = icpPrice ? formatNumber(totalAssets * icpPrice.usd) : undefined;

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
          <h2 className="text-4xl font-semibold tracking-tight text-foreground">
            <Trans
              i18nKey={($) => $.home.participateTitle}
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </h2>
          <p className="text-lg font-light">{t(($) => $.home.participateSubtitle)}</p>
        </div>

        <Separator className="my-6 mr-auto ml-auto w-2/3! bg-blend-difference" />

        <div className="mt-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="min-h-[100px] space-y-1">
            <p className="text-sm font-semibold tracking-wide uppercase">
              {t(($) => $.home.totalValue)}
            </p>
            <div className="flex items-baseline gap-2">
              {balanceQuery.isLoading || neuronsQuery.isLoading ? (
                <Skeleton className="h-13 w-44" />
              ) : (
                <p className="text-5xl font-bold text-foreground">
                  {t(($) => $.common.inIcp, { value: formatNumber(totalAssets) })}
                </p>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              {balanceQuery.isLoading || neuronsQuery.isLoading || tickersQuery.isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <p className="text-lg font-semibold">
                  {t(($) => $.account.approxUsd, { value: totalAssetsUsd })}
                </p>
              )}
            </div>
          </div>

          <div className="grid w-full sm:w-48">
            <div className="flex flex-col rounded-xl border border-border/50 bg-white/50 px-4 py-[10px] text-right shadow-sm backdrop-blur-sm xs:col-span-2 dark:bg-zinc-800/50">
              <p className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.icpUsd)}
              </p>
              <div className="flex justify-end">
                {icpPriceUsd ? (
                  <span className="text-lg font-semibold">${icpPriceUsd}</span>
                ) : (
                  <Skeleton className="h-7 w-14" />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
