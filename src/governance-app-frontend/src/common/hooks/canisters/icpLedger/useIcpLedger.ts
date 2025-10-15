import { LedgerCanister } from '@dfinity/ledger-icp';
import { Principal } from '@icp-sdk/core/principal';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { triggerError } from '@utils/error';
import { CanisterStatus } from '@common/typings/canisters';

export const useIcpLedger = (): CanisterStatus<LedgerCanister> => {
  if (!CANISTER_ID_ICP_LEDGER) {
    return triggerError('useIcpLedger', 'the canister Id is not defined');
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
    canister: LedgerCanister.create({
      agent: authenticated.agent || anonymous.agent,
      canisterId: Principal.fromText(CANISTER_ID_ICP_LEDGER),
    }),
  };
};
