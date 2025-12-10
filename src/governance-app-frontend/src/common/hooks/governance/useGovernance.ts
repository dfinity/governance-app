import { GovernanceCanister } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { errorMessage } from '@utils/error';
import { CanisterStatus } from '@common/typings/canisters';

export const useNnsGovernance = (): CanisterStatus<GovernanceCanister> => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw errorMessage('useNnsGovernance', 'the canister Id is not defined');
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
    canister: GovernanceCanister.create({
      agent: authenticated.agent || anonymous.agent,
      canisterId: Principal.fromText(CANISTER_ID_NNS_GOVERNANCE),
    }),
  };
};
