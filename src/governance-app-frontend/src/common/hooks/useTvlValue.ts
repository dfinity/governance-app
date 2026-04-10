import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';

export const useTvlValue = () => {
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = useGovernanceMetrics();
  const {
    tickerPrices: { data: prices, isLoading: isPricesLoading, isError: isPricesError },
  } = useTickerPrices();

  const lockedIcpE8s = metrics?.response?.totalLockedE8s;
  const icpPrice = CANISTER_ID_ICP_LEDGER ? prices?.get(CANISTER_ID_ICP_LEDGER)?.usd : undefined;

  let tvl: number | undefined;
  if (lockedIcpE8s && icpPrice) {
    tvl = bigIntDiv(lockedIcpE8s, E8Sn) * icpPrice;
  }

  return {
    tvl,
    isLoading: isMetricsLoading || isPricesLoading,
    isError: isMetricsError || isPricesError,
  };
};
