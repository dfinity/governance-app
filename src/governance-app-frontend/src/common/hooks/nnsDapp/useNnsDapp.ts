import { Actor, ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

import type { _SERVICE } from '@declarations/nns-dapp/nns-dapp.did';
import { idlFactory } from '@declarations/nns-dapp/nns-dapp.did.js';

import { CANISTER_ID_NNS_DAPP } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { CanisterStatus } from '@typings/canisters';
import { toCertifiedIdlFactory } from '@utils/candid';
import { errorMessage } from '@utils/error';

const certifiedIdlFactory = toCertifiedIdlFactory(idlFactory);

type NnsDappCanister = {
  service: ActorSubclass<_SERVICE>;
  certifiedService: ActorSubclass<_SERVICE>;
};

export const useNnsDapp = (): CanisterStatus<NnsDappCanister> => {
  if (!CANISTER_ID_NNS_DAPP) {
    throw errorMessage('useNnsDapp', 'the canister Id is not defined');
  }

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const agent = authenticated.agent || anonymous.agent;

  if (!agent) {
    return { ready: false, authenticated: false, canister: undefined };
  }

  const canisterId = Principal.fromText(CANISTER_ID_NNS_DAPP);
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
