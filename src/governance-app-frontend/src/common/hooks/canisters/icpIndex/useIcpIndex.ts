import { IndexCanister } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { useAgentPool } from '@hooks/useAgentPool';

import { CANISTER_ID_ICP_INDEX } from '@constants/canisterIds';
import { errorMessage } from '@utils/error';
import { CanisterStatus } from '@common/typings/canisters';

export const useIcpIndex = (): CanisterStatus<IndexCanister> => {
  if (!CANISTER_ID_ICP_INDEX) {
    throw errorMessage('useIcpIndex', 'the canister Id is not defined');
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
    canister: IndexCanister.create({
      agent: authenticated.agent || anonymous.agent,
      canisterId: Principal.fromText(CANISTER_ID_ICP_INDEX),
    }),
  };
};
