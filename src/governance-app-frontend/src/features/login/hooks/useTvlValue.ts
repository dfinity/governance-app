
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useGovernanceMetrics } from '@hooks/governance';
import { useIcpSwapPrices } from '@hooks/tickers/useIcpSwapPrices';

export const useTvlValue = () => {
    const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError } = useGovernanceMetrics();
    const { data: prices, isLoading: isPricesLoading, isError: isPricesError } = useIcpSwapPrices({});

    const lockedIcpE8s = metrics?.response?.totalLockedE8s;
    const icpPrice = CANISTER_ID_ICP_LEDGER ? prices?.get(CANISTER_ID_ICP_LEDGER)?.usd : undefined;

    let tvl: number | undefined;
    if (lockedIcpE8s && icpPrice) {
        tvl = (Number(lockedIcpE8s) / 100_000_000) * icpPrice;
    }

    return {
        tvl,
        isLoading: isMetricsLoading || isPricesLoading,
        isError: isMetricsError || isPricesError,
    };
};
