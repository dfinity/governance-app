import { useIcpSwapPrices } from './useIcpSwapPrices';

export enum TickerPricesSource {
  ICP_SWAP = 'IcpSwap',
}

export const useTickerPrices = () => {
  const icpSwapPrices = useIcpSwapPrices({ enabled: true, retryCount: 3 });

  return {
    tickerPrices: icpSwapPrices,
    tickerPricesSource: TickerPricesSource.ICP_SWAP,
  };
};
