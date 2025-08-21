import { LedgerCanister } from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';

import { CANISTER_ID_ICP_LEDGER } from '@common/constants/canisterIds';
import { useAgentPool } from '@common/hooks/useAgentPool';
import { CanisterStatus } from '@common/types/canisters';

export const useIcpLedger = (): CanisterStatus<LedgerCanister> => {
  if (!CANISTER_ID_ICP_LEDGER) {
    throw new Error('useIcpLedger: the canister Id is not defined.');
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
