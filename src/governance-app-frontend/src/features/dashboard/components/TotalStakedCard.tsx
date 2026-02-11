import { useTranslation } from 'react-i18next';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import { Skeleton } from '@components/Skeleton';

export const TotalStakedCard = () => {
  const { t } = useTranslation();
  const metricsQuery = useGovernanceMetrics();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const metrics = metricsQuery.data?.response;
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const totalLockedIcp = metrics?.totalLockedE8s
    ? bigIntDiv(metrics.totalLockedE8s, E8Sn)
    : undefined;

  const totalStakedUsd =
    totalLockedIcp !== undefined && icpPrice
      ? formatNumber(totalLockedIcp * icpPrice.usd, { minFraction: 0, maxFraction: 0 })
      : undefined;

  const totalSupplyIcp = metrics?.totalSupplyIcp
    ? bigIntDiv(metrics.totalSupplyIcp, E8Sn)
    : undefined;

  const stakedPercentage =
    totalLockedIcp !== undefined && totalSupplyIcp
      ? formatNumber((totalLockedIcp / totalSupplyIcp) * 100, {
          minFraction: 1,
          maxFraction: 1,
        })
      : undefined;

  const isLoading = metricsQuery.isLoading || tickersQuery.isLoading;

  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4 shadow-sm dark:bg-zinc-800/50">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(($) => $.home.totalStaked)}
      </p>
      {isLoading ? (
        <>
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-28" />
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground">
            {totalStakedUsd ? `$${totalStakedUsd}` : '—'}
          </p>
          {stakedPercentage && (
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {t(($) => $.home.ofTotalSupply, { value: stakedPercentage })}
            </p>
          )}
        </>
      )}
    </div>
  );
};
