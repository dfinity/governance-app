import { GovernanceCanister } from '@dfinity/nns';
import { Principal } from '@dfinity/principal';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { CanisterStatus } from '@common/typings/canisters';

export const useNnsGovernance = (): CanisterStatus<GovernanceCanister> => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw new Error('useGovernanceCanister: the canister Id is not defined.');
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
