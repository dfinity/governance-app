import { useIcpSwapPrices } from './useIcpSwapPrices';
import { useKongSwapPrices } from './useKongSwapPrices';

export enum TickerPricesSource {
  KONG_SWAP = 'KongSwap',
  ICP_SWAP = 'IcpSwap',
}

export const useTickerPrices = () => {
  const icpSwapPrices = useIcpSwapPrices({ enabled: true, retryCount: 3 });
  const useFallback = icpSwapPrices.isError;
  const kongSwapPrices = useKongSwapPrices({ enabled: useFallback, retryCount: 1 });

  return {
    // Fallback to KongSwap if IcpSwap fails.
    tickerPrices: useFallback ? kongSwapPrices : icpSwapPrices,
    tickerPricesSource: useFallback ? TickerPricesSource.KONG_SWAP : TickerPricesSource.ICP_SWAP,
  };
};
