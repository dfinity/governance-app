import { Actor, ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

import type { _SERVICE } from '@declarations/dashboard-collector/dashboard-collector.did';
import { idlFactory } from '@declarations/dashboard-collector/dashboard-collector.did.js';

import { CANISTER_ID_DASHBOARD_COLLECTOR } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { CanisterStatus } from '@typings/canisters';
import { errorMessage } from '@utils/error';

// The collector refuses update calls, so it has no certified service.
type DashboardCollectorCanister = {
  service: ActorSubclass<_SERVICE>;
};

export const useDashboardCollectorCanister = (): CanisterStatus<DashboardCollectorCanister> => {
  if (!CANISTER_ID_DASHBOARD_COLLECTOR)
    throw errorMessage('useDashboardCollectorCanister', 'the canister Id is not defined');

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const agent = authenticated.agent || anonymous.agent;

  if (!agent) return { ready: false, authenticated: false, canister: undefined };

  const service = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: Principal.fromText(CANISTER_ID_DASHBOARD_COLLECTOR),
  });

  return {
    ready: true,
    authenticated: !!authenticated.agent,
    canister: { service },
  };
};
