import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import { CANISTER_ID_CKUSD_LEDGER, CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { ICP_SWAP_URL } from '@constants/externalServices';
import { IcpSwapTicker } from '@typings/icpSwap';
import { TokenPrices } from '@typings/tokenPrices';
import { errorMessage } from '@utils/error';
import { isFiniteNonZeroNumber } from '@utils/numbers';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  enabled?: boolean;
  retryCount?: number;
};

export const useIcpSwapPrices = ({ enabled = true, retryCount = 3 }: Props) => {
  if (!ICP_SWAP_URL) {
    throw errorMessage('useIcpSwapPrices', 'icpSwap URL is not defined');
  }

  return useQuery<TokenPrices>({
    queryKey: [QUERY_KEYS.EXTERNAL_SERVICES.ICP_SWAP_PRICES],
    queryFn: () =>
      fetch(`${ICP_SWAP_URL}/tickers`)
        .then((response) => response.json())
        .then(parseIcpSwapTickers),
    staleTime: 15 * 60 * 1000, // Longer stale time on this one: the API updates every 15 minutes.
    enabled,
    retry: (failureCount) => failureCount < retryCount,
  });
};

export const parseIcpSwapTickers = (tickers: IcpSwapTicker[]): TokenPrices => {
  if (!CANISTER_ID_CKUSD_LEDGER) {
    throw errorMessage('parseIcpSwapTickers', 'ckUSDC ledger canister Id is not defined');
  }

  if (!CANISTER_ID_ICP_LEDGER) {
    throw errorMessage('parseIcpSwapTickers', 'icpLedger canister Id is not defined');
  }

  if (!Array.isArray(tickers)) {
    throw errorMessage('parseIcpSwapTickers', 'unexpected response format from IcpSwap');
  }

  // First, get all ICP-based tickers.
  const icpBasedTickers = tickers.filter(({ target_id }) => target_id === CANISTER_ID_ICP_LEDGER);

  // Group tickers by base_id to identify pairs with multiple tickers.
  const tickersByBaseId = icpBasedTickers.reduce(
    (acc, ticker) => {
      const baseId = ticker.base_id;
      if (!acc[baseId]) acc[baseId] = [];
      acc[baseId].push(ticker);
      return acc;
    },
    {} as Record<string, IcpSwapTicker[]>,
  );

  // Apply volume filtering in case there are multiple tickers for the same pair.
  const filteredTickers = Object.values(tickersByBaseId).flatMap((tickersForPair) => {
    if (tickersForPair.length === 1) {
      // Single ticker for this pair: keep it regardless of volume.
      return tickersForPair;
    } else {
      // Multiple tickers for this pair: take the one with highest volume.
      return tickersForPair
        .sort((a, b) => Number(b.target_volume_24H) - Number(a.target_volume_24H))
        .slice(0, 1);
    }
  });

  // Find ckUSDC ticker to get ICP price in ckUSDC.
  const ckusdcTicker = filteredTickers.find(
    (ticker) => ticker.base_id === CANISTER_ID_CKUSD_LEDGER,
  );
  if (isNullish(ckusdcTicker)) {
    throw errorMessage('parseIcpSwapTickers', 'ckUSDC ticker not found');
  }
  const icpPriceInCkusdc = Number(ckusdcTicker.last_price);
  if (!isFiniteNonZeroNumber(icpPriceInCkusdc)) {
    throw errorMessage('parseIcpSwapTickers', 'invalid ICP ckUSDC price');
  }

  // Compute prices for all tickers in ICP and USD.
  const result: TokenPrices = new Map();
  for (const ticker of filteredTickers) {
    const lastPrice = Number(ticker.last_price);
    // Skip invalid or zero prices.
    if (!isFiniteNonZeroNumber(lastPrice)) continue;

    const priceInIcp = 1 / lastPrice;
    const priceInUsd = icpPriceInCkusdc * priceInIcp;
    result.set(ticker.base_id, {
      _name: ticker.ticker_name,
      icp: priceInIcp,
      usd: priceInUsd,
    });
  }

  // There is no direct ticker for ICP itself in the dataset, but we do want the ICP price as well, so we add it manually.
  result.set(CANISTER_ID_ICP_LEDGER, { _name: 'ICP', icp: 1, usd: icpPriceInCkusdc });

  return result;
};
