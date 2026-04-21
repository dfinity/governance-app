import { IS_TESTNET } from '@constants/extra';

import { useExchangeRate } from './useExchangeRate';
import { useIcpSwapPrices } from './useIcpSwapPrices';

export enum TickerPricesSource {
  XRC = 'XRC',
  ICP_SWAP = 'IcpSwap',
}

export const useTickerPrices = () => {
  const exchangeRate = useExchangeRate({ enabled: true, retryCount: 1 });
  const useFallback = IS_TESTNET || exchangeRate.isError;
  const icpSwapPrices = useIcpSwapPrices({ enabled: useFallback, retryCount: 1 });

  return {
    // Fallback to IcpSwap if the backend exchange rate fails.
    tickerPrices: useFallback ? icpSwapPrices : exchangeRate,
    tickerPricesSource: useFallback ? TickerPricesSource.ICP_SWAP : TickerPricesSource.XRC,
  };
};
