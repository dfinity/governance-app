import { useIcpSwapPrices } from './useIcpSwapPrices';
import { useKongSwapPrices } from './useKongSwapPrices';

export enum TickerPricesSource {
  ICP_SWAP = 'IcpSwap',
  KONG_SWAP = 'KongSwap',
}

export const useTickerPrices = () => {
  const icpSwapPrices = useIcpSwapPrices({ enabled: true, retryCount: 1 });
  const useFallback = icpSwapPrices.isError;
  const kongSwapPrices = useKongSwapPrices({ enabled: useFallback, retryCount: 3 });

  return {
    // Fallback to KongSwap if IcpSwap fails 2 times in a row.
    tickerPrices: useFallback ? kongSwapPrices : icpSwapPrices,
    tickerPricesSource: useFallback ? TickerPricesSource.KONG_SWAP : TickerPricesSource.ICP_SWAP,
  };
};
