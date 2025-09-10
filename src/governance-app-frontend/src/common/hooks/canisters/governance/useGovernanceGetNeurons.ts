import { NeuronId } from '@dfinity/nns';
import { NeuronSubaccount } from '@dfinity/nns/dist/candid/governance';

import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useNnsGovernanceCanister } from './useGovernanceCanister';

type RequestParams = {
  certified: boolean;
  neuronIds?: NeuronId[];
  includeEmptyNeurons?: boolean;
  includePublicNeurons?: boolean;
  neuronSubaccounts?: NeuronSubaccount[];
};

export const useGovernanceGetNeurons = (params?: RequestParams) => {
  const { ready, canister, authenticated } = useNnsGovernanceCanister();

  const request: RequestParams = {
    certified: false,
    neuronIds: [],
    includeEmptyNeurons: true,
    includePublicNeurons: true,
    neuronSubaccounts: [],
    ...params,
  };

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.GET_NEURONS, request],
    queryFn: () => canister!.listNeurons(request),
    updateFn: () => canister!.listNeurons({ ...request, certified: true }),
    options: {
      enabled: ready && authenticated,
    },
  });
};
