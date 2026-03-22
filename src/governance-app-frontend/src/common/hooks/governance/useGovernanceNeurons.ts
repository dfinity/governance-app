import { NeuronId } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { isNonEmptyNeuron } from '@utils/neuron';
import { QUERY_KEYS } from '@utils/query';

import { useNnsGovernance } from './useGovernance';

type RequestParams = {
  neuronIds?: NeuronId[];
  includeEmptyNeurons?: boolean;
  includePublicNeurons?: boolean;
  neuronSubaccounts?: { subaccount: Uint8Array }[];
};

type HookParams = RequestParams & { enabled?: boolean };

const sortByCreatedDesc = (
  a: { createdTimestampSeconds: bigint },
  b: { createdTimestampSeconds: bigint },
) => Number(b.createdTimestampSeconds - a.createdTimestampSeconds);

export const useGovernanceNeurons = (params?: HookParams) => {
  const { identity } = useInternetIdentity();
  const { ready, canister, authenticated } = useNnsGovernance();

  const { enabled = true, ...overrides } = params ?? {};

  const request: RequestParams = {
    neuronIds: undefined,
    includeEmptyNeurons: false,
    includePublicNeurons: true,
    neuronSubaccounts: undefined,
    ...overrides,
  };

  const principal = identity?.getPrincipal().toText();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS, request, principal],
    queryFn: () =>
      canister!
        .listNeurons({ ...request, certified: false })
        .then((data) => data.filter(isNonEmptyNeuron).toSorted(sortByCreatedDesc)),
    updateFn: () =>
      canister!
        .listNeurons({ ...request, certified: true })
        .then((data) => data.filter(isNonEmptyNeuron).toSorted(sortByCreatedDesc)),
    options: {
      enabled: ready && authenticated && enabled,
    },
  });
};
