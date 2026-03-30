import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import type { IcpExchangeRateResponse } from '@declarations/governance-app-backend/governance-app-backend.did';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8S } from '@constants/extra';
import { useGovernanceAppCanister } from '@hooks/addressBook/useGovernanceAppCanister';
import { TokenPrices } from '@typings/tokenPrices';
import { QUERY_KEYS } from '@utils/query';

type Props = {
  enabled?: boolean;
  retryCount?: number;
};

export const useExchangeRate = ({ enabled = true, retryCount = 3 }: Props) => {
  const canisterStatus = useGovernanceAppCanister();

  return useQuery<TokenPrices>({
    queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.EXCHANGE_RATE],
    queryFn: async () => {
      if (!canisterStatus.ready) {
        throw new Error('Canister not ready');
      }

      const response = await canisterStatus.canister.service.get_icp_to_usd_exchange_rate();
      return parseExchangeRateResponse(response);
    },
    enabled: enabled && canisterStatus.ready,
    retry: (failureCount) => failureCount < retryCount,
  });
};

export const parseExchangeRateResponse = (response: IcpExchangeRateResponse): TokenPrices => {
  if (isNullish(CANISTER_ID_ICP_LEDGER)) {
    throw new Error('ICP ledger canister ID is not defined');
  }

  const currentRate = response.current[0];
  if (isNullish(currentRate)) {
    throw new Error('No current exchange rate available');
  }

  const icpPriceUsd = Number(currentRate.rate_e8s) / E8S;
  if (icpPriceUsd <= 0 || !Number.isFinite(icpPriceUsd)) {
    throw new Error('Invalid exchange rate');
  }

  const result: TokenPrices = new Map();
  result.set(CANISTER_ID_ICP_LEDGER, { _name: 'ICP', icp: 1, usd: icpPriceUsd });

  return result;
};
