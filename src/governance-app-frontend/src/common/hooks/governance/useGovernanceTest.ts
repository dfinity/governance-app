import { NnsGovernanceTestCanister } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { errorMessage } from '@utils/error';
import { CanisterStatus } from '@common/typings/canisters';

export const useNnsGovernanceTest = (): CanisterStatus<NnsGovernanceTestCanister> => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw errorMessage('useNnsGovernanceTest', 'the canister Id is not defined');
  }

  const { anonymous, authenticated } = useAgentPool().agentPool;

  if (!authenticated.agent && !anonymous.agent) {
    return {
      ready: false,
      authenticated: false,
      canister: undefined,
    };
  }

  return {
    ready: true,
    authenticated: !!authenticated.agent,
    canister: NnsGovernanceTestCanister.create({
      agent: authenticated.agent || anonymous.agent,
      canisterId: Principal.fromText(CANISTER_ID_NNS_GOVERNANCE),
    }),
  };
};
