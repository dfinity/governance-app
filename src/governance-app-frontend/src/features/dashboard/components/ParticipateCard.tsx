import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s, getNeuronStakeE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

// @TODO: Add endpoint to backend
const TVL = 721974123;

export const ParticipateCard = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Data Fetching
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
  const totalAssetsUsd = icpPrice ? (totalAssets * icpPrice.usd).toFixed(2) : undefined;
  const icpPriceUsd = icpPrice ? icpPrice.usd.toFixed(2) : undefined;

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let requestID: number;
    let time = 0;
    const flowLayers = 5;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(10px)';
      time += 0.003;

      for (let layer = 0; layer < flowLayers; layer++) {
        ctx.beginPath();

        const layerOffset = layer * 50;
        const waveHeight = 60 + layer * 20;
        const frequency = 0.008 - layer * 0.002;
        const speed = 1 + layer * 0.3;

        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y1 = Math.sin(x * frequency + time * speed) * waveHeight;
          const y2 = Math.cos(x * frequency * 1.5 - time * speed * 0.7) * (waveHeight * 0.5);
          // Adjust y so waves are at the bottom
          const y = canvas.height * 0.7 + y1 + y2 + layerOffset - 50;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const opacity1 = 0.3 + layer * 0.06;
        const opacity2 = 0.2 + layer * 0.04;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        // Using purple colors as requested
        gradient.addColorStop(0, 'rgba(126, 34, 206, ' + opacity1 + ')'); // purple-700
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, ' + (opacity1 + opacity2) / 2 + ')'); // purple-400
        gradient.addColorStop(1, 'rgba(126, 34, 206, ' + opacity2 + ')');

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      requestID = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(requestID);
    };
  }, []);

  const isLoading = transactionsQuery.isLoading || neuronsQuery.isLoading;

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
                <SkeletonLoader width={150} height={40} />
              ) : (
                <span className="text-4xl font-bold text-foreground">
                  {formatNumber(totalAssets)} ICP
                </span>
              )}
            </div>
            <div>
              {isLoading || !totalAssetsUsd ? (
                <SkeletonLoader width={100} height={20} />
              ) : (
                <span className="text-sm font-semibold">≈ ${totalAssetsUsd}</span>
              )}
            </div>
          </div>

          {/* Right: Metrics  */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-[160px] flex-col rounded-xl border border-border/50 bg-white/50 p-3 text-right shadow-sm backdrop-blur-sm dark:bg-zinc-800/50">
              <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.icpUsd)}
              </span>
              <span className="text-lg font-bold">
                {icpPriceUsd ? `$${icpPriceUsd}` : <SkeletonLoader width={60} height={24} />}
              </span>
            </div>

            <a
              href="https://dashboard.internetcomputer.org/neurons"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[160px] flex-col rounded-xl border border-border/50 bg-white/50 p-3 text-right shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/70"
            >
              <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t(($) => $.home.tvl)}
              </span>
              <span className="text-lg font-bold">
                $ {formatNumber(TVL, { minFraction: 0, maxFraction: 0 })}
              </span>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
