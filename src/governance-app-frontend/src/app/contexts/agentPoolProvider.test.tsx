import type { HttpAgent, Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { act, render, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AgentPool, AgentPoolContext } from './agentPoolContext';

const { session, pendingAgents } = vi.hoisted(() => ({
  session: { identity: undefined as Identity | undefined },
  pendingAgents: new Map<Identity, (agent: HttpAgent) => void>(),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: session.identity }),
}));

vi.mock('@common/canisters/agents', () => ({
  getAnonymousAgent: async () => ({}) as HttpAgent,
  getAuthenticatedAgent: (identity: Identity) =>
    new Promise<HttpAgent>((resolve) => pendingAgents.set(identity, resolve)),
  clearAuthenticatedAgent: vi.fn(),
  clearLedgerAgents: vi.fn(),
}));

vi.mock('@common/ledger/session', () => ({ clearLedgerIdentities: vi.fn() }));

const { AgentPoolProvider } = await import('./agentPoolProvider');

let latest: AgentPool | undefined;

const Probe = () => {
  latest = useContext(AgentPoolContext)?.agentPool;
  return null;
};

const renderPool = () =>
  render(
    <AgentPoolProvider>
      <Probe />
    </AgentPoolProvider>,
  );

describe('AgentPoolProvider', () => {
  it('keeps the agent of a renewed session when the agent before it finishes later', async () => {
    const before = Ed25519KeyIdentity.generate();
    session.identity = before;
    const view = renderPool();
    await waitFor(() => expect(pendingAgents.has(before)).toBe(true));

    // Another tab renews the session of the same account.
    const renewed = Ed25519KeyIdentity.fromSecretKey(before.getKeyPair().secretKey);
    session.identity = renewed;
    view.rerender(
      <AgentPoolProvider>
        <Probe />
      </AgentPoolProvider>,
    );
    await waitFor(() => expect(pendingAgents.has(renewed)).toBe(true));

    const renewedAgent = { name: 'renewed' } as unknown as HttpAgent;
    await act(async () => pendingAgents.get(renewed)?.(renewedAgent));
    await act(async () => pendingAgents.get(before)?.({ name: 'before' } as unknown as HttpAgent));

    expect(latest?.authenticated.agent).toBe(renewedAgent);
  });
});
