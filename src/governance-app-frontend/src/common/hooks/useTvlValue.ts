import { E8Sn } from '@constants/extra';
import { useGovernanceMetrics } from '@hooks/governance';
import { useIcpPrice } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';

export const useTvlValue = () => {
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = useGovernanceMetrics();
  const {
    icpPrice,
    formatFiat,
    isLoading: isIcpPriceLoading,
    isError: isIcpPriceError,
  } = useIcpPrice();

  const lockedIcpE8s = metrics?.response?.totalLockedE8s;

  let tvl: number | undefined;
  if (lockedIcpE8s && icpPrice) {
    tvl = bigIntDiv(lockedIcpE8s, E8Sn) * icpPrice;
  }

  return {
    tvl,
    formatTvl: (value: number) => formatFiat(value, { minFraction: 0, maxFraction: 0 }),
    isLoading: isMetricsLoading || isIcpPriceLoading,
    isError: isMetricsError || isIcpPriceError,
  };
};
