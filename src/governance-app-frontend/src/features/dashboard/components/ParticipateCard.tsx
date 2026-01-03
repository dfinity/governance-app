import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Trans, useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useWaveAnimation } from '../hooks/useWaveAnimation';

// @TODO: Add endpoint to backend
// Total value locked (TVL) in USD
const TVL = 721974123;

// @TODO: How do we display errors?
export const ParticipateCard = () => {
  const { t } = useTranslation();

  const { tickerPrices } = useTickerPrices();
  const transactionsQuery = useIcpIndexTransactions();
  const neuronsQuery = useGovernanceNeurons();

  // Calculate Total Assets
  const liquidBalance = transactionsQuery.data?.pages?.[0]?.response?.balance
    ? bigIntDiv(transactionsQuery.data.pages[0].response.balance, E8Sn, 2)
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

  const isLoading = transactionsQuery.isLoading || neuronsQuery.isLoading;

  const { canvasRef, containerRef } = useWaveAnimation({ dependencies: [totalAssets, icpPrice] });

  return (
    <Card
      className="relative overflow-hidden border-none bg-white shadow-sm dark:bg-zinc-900"
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0"
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-[160px] flex-col rounded-xl border border-border/50 bg-white/50 p-3 text-right shadow-sm backdrop-blur-sm dark:bg-zinc-800/50">
              <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.icpUsd)}
              </span>
              <span className="text-lg font-semibold">
                {icpPriceUsd ? `$${icpPriceUsd}` : <Skeleton className="h-7 w-32" />}
              </span>
            </div>

            <a
              href="https://dashboard.internetcomputer.org/neurons"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[160px] flex-col rounded-xl border border-border/50 bg-white/50 p-3 text-right shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/70"
              aria-label={t(($) => $.home.tvl.label)}
            >
              <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.tvl.title)}
              </span>
              <span className="text-lg font-semibold">
                $ {formatNumber(TVL, { minFraction: 0, maxFraction: 0 })}
              </span>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
