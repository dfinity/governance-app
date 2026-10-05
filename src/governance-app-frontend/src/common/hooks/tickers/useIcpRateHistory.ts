import { useQuery } from '@tanstack/react-query';

import type { CachedRate } from '@declarations/governance-app-backend/governance-app-backend.did';

import { E8S } from '@constants/extra';
import { useGovernanceAppCanister } from '@hooks/addressBook/useGovernanceAppCanister';
import { QUERY_KEYS } from '@utils/query';

export type IcpRatePoint = {
  timestampSeconds: number;
  usd: number;
};

type Props = {
  enabled?: boolean;
};

export const useIcpRateHistory = ({ enabled = true }: Props) => {
  const canisterStatus = useGovernanceAppCanister();

  return useQuery<IcpRatePoint[]>({
    queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.EXCHANGE_RATE_HISTORY],
    queryFn: async () => {
      if (!canisterStatus.ready) {
        throw new Error('Canister not ready');
      }

      const response = await canisterStatus.canister.service.get_icp_to_usd_rate_history();
      return parseRateHistoryResponse(response);
    },
    enabled: enabled && canisterStatus.ready,
    retry: 1,
  });
};

export const parseRateHistoryResponse = (rates: CachedRate[]): IcpRatePoint[] =>
  rates
    .map(({ rate_e8s, timestamp_seconds }) => ({
      timestampSeconds: Number(timestamp_seconds),
      usd: Number(rate_e8s) / E8S,
    }))
    .filter(({ usd }) => usd > 0);
