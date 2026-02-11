import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useTickerPrices } from '@hooks/tickers';
import { formatNumber } from '@utils/numbers';

import { Skeleton } from '@components/Skeleton';

export const IcpPriceCard = () => {
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const icpPriceUsd = icpPrice ? formatNumber(icpPrice.usd) : undefined;

  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4 shadow-sm dark:bg-zinc-800/50">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        ICP Price
      </p>
      {tickersQuery.isLoading ? (
        <>
          <Skeleton className="mb-2 h-8 w-24" />
          <Skeleton className="h-4 w-20" />
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground">
            {icpPriceUsd ? `$${icpPriceUsd}` : '—'}
          </p>
          {/* TODO: Integrate 24h price change data source */}
          <p className="mt-1 text-sm font-normal text-muted-foreground">— (24h)</p>
        </>
      )}
    </div>
  );
};
