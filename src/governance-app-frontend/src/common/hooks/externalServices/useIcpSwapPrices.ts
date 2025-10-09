import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import {
  CANISTER_ID_CKUSD_LEDGER,
  CANISTER_ID_ICP_LEDGER,
  ICP_SWAP_URL,
} from '@constants/canisterIds';
import { IcpSwapTicker } from '@typings/icpSwap';
import { QUERY_KEYS } from '@utils/query';

export type TokenPrices = Record<
  string,
  {
    icp: number;
    usd: number;
  }
>;

export const useIcpSwapPrices = () => {
  if (!ICP_SWAP_URL) {
    throw new Error('useIcpSwapPrices: ICP Swap URL is not defined.');
  }

  return useQuery<TokenPrices>({
    queryKey: [QUERY_KEYS.EXTERNAL_SERVICES.ICP_SWAP.PRICES],
    queryFn: () =>
      fetch(`${ICP_SWAP_URL}/tickers`).then((res) => {
        try {
          const data = res.json();
          if (!Array.isArray(data)) {
            throw new Error('useIcpSwapPrices: Unexpected response format from ICP Swap.');
          }
          return parseTickers(data);
        } catch {
          throw new Error('useIcpSwapPrices: Failed to parse JSON response.');
        }
      }),
  });
};

export const parseTickers = (tickers: IcpSwapTicker[]): TokenPrices => {
  if (!CANISTER_ID_CKUSD_LEDGER) {
    throw new Error('parseTickers: ckUSDC ledger canister ID is not defined.');
  }

  if (!CANISTER_ID_ICP_LEDGER) {
    throw new Error('parseTickers: ICP ledger canister ID is not defined.');
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

  // Apply volume filter only when there are multiple tickers for the same pair.
  const filteredTickers = Object.values(tickersByBaseId).flatMap((tickersForPair) => {
    if (tickersForPair.length === 1) {
      // Single ticker for this pair - keep it regardless of volume.
      return tickersForPair;
    } else {
      // Multiple tickers for this pair - filter by volume.
      return tickersForPair
        .sort((a, b) => Number(b.target_volume_24H) - Number(a.target_volume_24H))
        .slice(0, 1);
    }
  });

  const ledgerCanisterIdToTicker: Record<string, IcpSwapTicker> = Object.fromEntries(
    filteredTickers.map((ticker) => [ticker.base_id, ticker]),
  );

  const ckusdcTicker = ledgerCanisterIdToTicker[CANISTER_ID_CKUSD_LEDGER];
  if (isNullish(ckusdcTicker)) {
    throw new Error('parseTickers: ckUSDC ticker not found.');
  }
  const icpPriceInCkusdc = Number(ckusdcTicker?.last_price);
  if (icpPriceInCkusdc === 0 || !Number.isFinite(icpPriceInCkusdc)) {
    throw new Error('parseTickers: invalid ICP ckUSDC price.');
  }

  const result: TokenPrices = {};
  for (const [ledgerCanisterId, ticker] of Object.entries(ledgerCanisterIdToTicker)) {
    const lastPrice = Number(ticker.last_price);
    if (lastPrice === 0 || !Number.isFinite(lastPrice)) {
      continue;
    }

    const priceInIcp = 1 / lastPrice;
    const priceInUsd = icpPriceInCkusdc * priceInIcp;
    result[ledgerCanisterId] = {
      icp: priceInIcp,
      usd: priceInUsd,
    };
  }

  // There is no ticker for ICP to ICP, but we do want the ICP price in ckUSDC.
  result[CANISTER_ID_ICP_LEDGER] = { icp: 1, usd: icpPriceInCkusdc };

  return result;
};
