import { canisterId, idlFactory } from '@declarations/icp-ledger';
import { _SERVICE } from '@declarations/icp-ledger/icp-ledger.did';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/common/utils/queryKeys';

import { useCanister } from '../useCanister';

export const useIcpLedgerTotalSupply = () => {
  const canister = useCanister<_SERVICE>({
    canisterId,
    idlFactory,
  });

  const { actor, isAuthenticated, isInitializing, error } = canister;
  const isReady = isAuthenticated && !isInitializing && !error;

  const totalSupplyQuery = useQuery({
    queryKey: [QUERY_KEYS.ICP_LEDGER.TOTAL_SUPPLY],
    queryFn: () => actor?.icrc1_total_supply(),
    enabled: isReady,
  });

  return {
    isReady,
    totalSupplyQuery,
  };
};
