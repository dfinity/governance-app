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

// One agent per Ledger device principal. A user can register more than one device.
const ledgerAgents = new Map<string, { identity: Identity; agent: Promise<HttpAgent> }>();

export const getLedgerAgent = (identity: Identity): Promise<HttpAgent> => {
  const principal = identity.getPrincipal().toText();
  const cached = ledgerAgents.get(principal);

  // The agent follows the identity instance. A fresh device connection (for example after
  // a logout that happened while the first connection was still pending) gets a fresh agent.
  if (cached?.identity === identity) return cached.agent;

  const agent = create(identity);
  const entry = { identity, agent };
  ledgerAgents.set(principal, entry);

  agent.catch(() => {
    // A failed creation (for example no root key from the local replica) must not block retries.
    if (ledgerAgents.get(principal) === entry) ledgerAgents.delete(principal);
  });

  return agent;
};

export const clearLedgerAgents = () => {
  ledgerAgents.clear();
};
