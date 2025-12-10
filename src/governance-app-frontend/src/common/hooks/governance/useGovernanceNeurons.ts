import { NeuronId } from '@icp-sdk/canisters/nns';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

type RequestParams = {
  certified: boolean;
  neuronIds?: NeuronId[];
  includeEmptyNeurons?: boolean;
  includePublicNeurons?: boolean;
  neuronSubaccounts?: { subaccount: Uint8Array }[];
};

export const useGovernanceNeurons = (params?: RequestParams) => {
  const { ready, canister, authenticated } = useNnsGovernance();

  const request: RequestParams = {
    certified: false,
    neuronIds: undefined,
    includeEmptyNeurons: true,
    includePublicNeurons: true,
    neuronSubaccounts: undefined,
    ...params,
  };

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS, request],
    queryFn: () =>
      canister!
        .listNeurons(request)
        .then((data) =>
          data.toSorted((a, b) => Number(b.createdTimestampSeconds - a.createdTimestampSeconds)),
        ),
    updateFn: () =>
      canister!
        .listNeurons({ ...request, certified: true })
        .then((data) =>
          data.toSorted((a, b) => Number(b.createdTimestampSeconds - a.createdTimestampSeconds)),
        ),
    options: {
      enabled: ready && authenticated,
    },
  });
};
