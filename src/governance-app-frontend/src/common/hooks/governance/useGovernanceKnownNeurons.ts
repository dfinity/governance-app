import { KNOWN_NEURONS } from '@features/voting/data/neurons';

import { IS_TESTNET } from '@constants/extra';
import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

export const useGovernanceKnownNeurons = () => {
  const { ready, canister } = useNnsGovernance();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.KNOWN_NEURONS],
    queryFn: () =>
      IS_TESTNET ? Promise.resolve(KNOWN_NEURONS) : canister!.listKnownNeurons(false),
    updateFn: () =>
      IS_TESTNET ? Promise.resolve(KNOWN_NEURONS) : canister!.listKnownNeurons(true),
    options: {
      enabled: ready || IS_TESTNET,
    },
  });
};
