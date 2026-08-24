import { AnonymousIdentity, HttpAgent, type Identity } from '@icp-sdk/core/agent';
import { createAgent } from '@dfinity/utils';

import { IS_LOCAL, NETWORK } from '@constants/extra';

/**
 * Agent singletons that live outside React.
 *
 * `AgentPoolProvider` used to own agent creation in an effect, which meant no IC
 * request could start until React had mounted. Route loaders run before that, so
 * the agents live here and the provider consumes them — both paths share one
 * instance, and a loader can reach the network while the route chunk is still
 * downloading.
 */

const create = (identity: Identity): Promise<HttpAgent> =>
  createAgent({ identity, host: NETWORK, fetchRootKey: IS_LOCAL });

let anonymousAgent: Promise<HttpAgent> | undefined;

export const getAnonymousAgent = (): Promise<HttpAgent> =>
  (anonymousAgent ??= create(new AnonymousIdentity()));

let authenticatedAgent: { principal: string; agent: Promise<HttpAgent> } | undefined;

export const getAuthenticatedAgent = (identity: Identity): Promise<HttpAgent> => {
  const principal = identity.getPrincipal().toText();

  // A new identity (login, or a re-login as somebody else) needs its own agent.
  if (authenticatedAgent?.principal !== principal) {
    authenticatedAgent = { principal, agent: create(identity) };
  }

  return authenticatedAgent.agent;
};

export const clearAuthenticatedAgent = () => {
  authenticatedAgent = undefined;
};
