import { useExchangeRate } from './useExchangeRate';
import { useIcpSwapPrices } from './useIcpSwapPrices';

export enum TickerPricesSource {
  BACKEND = 'Backend',
  ICP_SWAP = 'IcpSwap',
}

export const useTickerPrices = () => {
  const exchangeRate = useExchangeRate({ enabled: true, retryCount: 3 });
  const useFallback = exchangeRate.isError;
  const icpSwapPrices = useIcpSwapPrices({ enabled: useFallback, retryCount: 1 });

  return {
    // Fallback to IcpSwap if the backend exchange rate fails.
    tickerPrices: useFallback ? icpSwapPrices : exchangeRate,
    tickerPricesSource: useFallback ? TickerPricesSource.ICP_SWAP : TickerPricesSource.BACKEND,
  };
};
