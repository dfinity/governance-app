import { Actor, ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

import type { _SERVICE } from '@declarations/spam-filter/spam-filter.did';
import { idlFactory } from '@declarations/spam-filter/spam-filter.did.js';

import { CANISTER_ID_SPAM_FILTER } from '@constants/canisterIds';
import { useAgentPool } from '@hooks/useAgentPool';
import { CanisterStatus } from '@typings/canisters';
import { errorMessage } from '@utils/error';

export const useSpamFilterCanister = (): CanisterStatus<ActorSubclass<_SERVICE>> => {
  if (!CANISTER_ID_SPAM_FILTER)
    throw errorMessage('useSpamFilterCanister', 'the canister Id is not defined');

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const agent = authenticated.agent || anonymous.agent;

  if (!agent) return { ready: false, authenticated: false, canister: undefined };

  const canisterId = Principal.fromText(CANISTER_ID_SPAM_FILTER);
  const canister = Actor.createActor<_SERVICE>(idlFactory, { agent, canisterId });

  return {
    ready: true,
    authenticated: !!authenticated.agent,
    canister,
  };
};
