import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { governanceNeuronsQuery, NeuronsRequest, neuronsRequest } from '@common/queries/governance';

import { useNnsGovernance } from './useGovernance';

type Params = NeuronsRequest & { enabled?: boolean };

export const useGovernanceNeurons = (params?: Params) => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated } = useNnsGovernance();

  const { enabled = true, ...overrides } = params ?? {};

  const request = neuronsRequest(overrides);
  const principal = identity?.getPrincipal().toText();

  return useQueryThenUpdateCall({
    ...governanceNeuronsQuery({ request, principal }),
    options: {
      enabled: ready && authenticated && enabled,
    },
  });
};
