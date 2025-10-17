import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import { CANISTER_ID_CKUSD_LEDGER, CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { KONG_SWAP_URL } from '@constants/externalServices';
import { KongSwapTicker } from '@typings/kongSwap';
import { TokenPrices } from '@typings/tokenPrices';
import { errorMessage } from '@utils/error';
import { isFiniteNonZeroNumber } from '@utils/numbers';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  enabled?: boolean;
  retryCount?: number;
};

export const useKongSwapPrices = ({ enabled = true, retryCount = 3 }: Props) => {
  if (!KONG_SWAP_URL) {
    throw errorMessage('useKongSwapPrices', 'KongSwap URL is not defined');
  }

  return useQuery<TokenPrices>({
    queryKey: [QUERY_KEYS.EXTERNAL_SERVICES.KONG_SWAP_PRICES],
    queryFn: () =>
      fetch(`${KONG_SWAP_URL}/coingecko/tickers`)
        .then((response) => response.json())
        .then(parseKongSwapTickers),
    enabled,
    retry: (failureCount) => failureCount < retryCount,
  });
};

export const parseKongSwapTickers = (tickers: KongSwapTicker[]): TokenPrices => {
  if (!CANISTER_ID_CKUSD_LEDGER) {
    throw errorMessage('parseKongSwapTickers', 'ckUSDC ledger canister ID is not defined');
  }

  if (!CANISTER_ID_ICP_LEDGER) {
    throw errorMessage('parseKongSwapTickers', 'ICP ledger canister ID is not defined');
  }

  if (!Array.isArray(tickers)) {
    throw errorMessage('parseKongSwapTickers', 'Unexpected response format from Kong Swap');
  }

  // Filter all ICP-based tickers.
  const icpBasedTickers = tickers.filter(
    ({ target_currency }) => target_currency === CANISTER_ID_ICP_LEDGER,
  );

  // Find ckUSDC ticker to get ICP price in ckUSDC.
  const ckusdcTicker = icpBasedTickers.find(
    (ticker) => ticker.base_currency === CANISTER_ID_CKUSD_LEDGER,
  );
  if (isNullish(ckusdcTicker)) {
    throw errorMessage('parseKongSwapTickers', 'ckUSDC ticker not found');
  }
  const icpPriceInCkusdc = 1 / Number(ckusdcTicker.last_price);
  if (!isFiniteNonZeroNumber(icpPriceInCkusdc)) {
    throw errorMessage('parseKongSwapTickers', 'invalid ICP ckUSDC price');
  }

  // Compute prices for all tickers in ICP and USD.
  const result: TokenPrices = new Map();
  for (const ticker of icpBasedTickers) {
    const lastPrice = ticker.last_price;
    // Skip invalid or zero prices.
    if (!isFiniteNonZeroNumber(lastPrice)) continue;

    const priceInIcp = lastPrice;
    const priceInUsd = icpPriceInCkusdc * priceInIcp;
    result.set(ticker.base_currency, {
      name: 'N/A (KongSwap)',
      icp: priceInIcp,
      usd: priceInUsd,
    });
  }

  // There is no direct ticker for ICP itself in the dataset, but we do want the ICP price as well, so we add it manually.
  result.set(CANISTER_ID_ICP_LEDGER, { name: 'ICP', icp: 1, usd: icpPriceInCkusdc });

  return result;
};
