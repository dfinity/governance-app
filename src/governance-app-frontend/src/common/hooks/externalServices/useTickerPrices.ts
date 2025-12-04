import { useIcpSwapPrices } from './useIcpSwapPrices';
import { useKongSwapPrices } from './useKongSwapPrices';

export enum TickerPricesSource {
  KONG_SWAP = 'KongSwap',
  ICP_SWAP = 'IcpSwap',
}

export const useTickerPrices = () => {
  const kongSwapPrices = useKongSwapPrices({ enabled: true, retryCount: 1 });
  const useFallback = kongSwapPrices.isError;
  const icpSwapPrices = useIcpSwapPrices({ enabled: useFallback, retryCount: 3 });

  return {
    // Fallback to IcpSwap if KongSwap fails.
    tickerPrices: useFallback ? icpSwapPrices : kongSwapPrices,
    tickerPricesSource: useFallback ? TickerPricesSource.ICP_SWAP : TickerPricesSource.KONG_SWAP,
  };
};
