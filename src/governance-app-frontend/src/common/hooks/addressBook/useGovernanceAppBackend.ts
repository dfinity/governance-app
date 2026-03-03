import { Actor, ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

import type { _SERVICE } from '@declarations/governance-app-backend/governance-app-backend.did';
import { idlFactory } from '@declarations/governance-app-backend/governance-app-backend.did.js';

import { CANISTER_ID_SELF } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { CanisterStatus } from '@typings/canisters';
import { toCertifiedIdlFactory } from '@utils/candid';
import { errorMessage } from '@utils/error';

const certifiedIdlFactory = toCertifiedIdlFactory(idlFactory);

type GovernanceAppBackend = {
  service: ActorSubclass<_SERVICE>;
  certifiedService: ActorSubclass<_SERVICE>;
};

export const useGovernanceAppBackend = (): CanisterStatus<GovernanceAppBackend> => {
  if (!CANISTER_ID_SELF) {
    throw errorMessage('useGovernanceAppBackend', 'the canister Id is not defined');
  }

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const agent = authenticated.agent || anonymous.agent;

  if (!agent) {
    return { ready: false, authenticated: false, canister: undefined };
  }

  const canisterId = Principal.fromText(CANISTER_ID_SELF);
  const service = Actor.createActor<_SERVICE>(idlFactory, { agent, canisterId });
  const certifiedService = Actor.createActor<_SERVICE>(certifiedIdlFactory, {
    agent,
    canisterId,
  });

  return {
    ready: true,
    authenticated: !!authenticated.agent,
    canister: {
      service,
      certifiedService,
    },
  };
};
