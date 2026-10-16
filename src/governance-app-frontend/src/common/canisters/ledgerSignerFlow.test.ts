import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerIdentity } from '@common/ledger/ledgerIdentity';
import { clearLedgerIdentities } from '@common/ledger/session';

import { MockLedgerIdentity } from '../../../tests/mocks/ledgerIdentity';

const createAgent = vi.hoisted(() => vi.fn());
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  createAgent,
}));

const governanceCreate = vi.hoisted(() => vi.fn());
vi.mock('@icp-sdk/canisters/nns', () => ({
  NnsGovernanceCanister: { create: governanceCreate },
}));

vi.mock('ic-use-internet-identity', () => ({ ensureInitialized: async () => undefined }));

const { clearLedgerAgents } = await import('./agents');
const { getNnsGovernanceCanister } = await import('./index');

const DEVICE_PRINCIPAL = new MockLedgerIdentity().getPrincipal().toText();
const SIGNER = { kind: 'ledger', principal: DEVICE_PRINCIPAL } as const;

const agentOf = (call: number) => governanceCreate.mock.calls[call][0].agent;

/** The Ledger signer path end to end: session cache, agent cache, and canister factory. */
describe('Ledger signer flow', () => {
  beforeEach(() => {
    createAgent.mockImplementation(async ({ identity }) => ({ identity }));
    governanceCreate.mockImplementation((options) => options);
  });

  afterEach(() => {
    clearLedgerIdentities();
    clearLedgerAgents();
    vi.restoreAllMocks();
    createAgent.mockReset();
    governanceCreate.mockReset();
  });

  it('gives a new session a fresh agent when the logout happened during the connection', async () => {
    const firstIdentity = new MockLedgerIdentity();
    const secondIdentity = new MockLedgerIdentity();
    let finishFirstConnection: (identity: LedgerIdentity) => void = () => undefined;
    vi.spyOn(LedgerIdentity, 'create')
      .mockImplementationOnce(
        () =>
          new Promise<LedgerIdentity>((resolve) => {
            finishFirstConnection = resolve;
          }),
      )
      .mockImplementationOnce(async () => secondIdentity);

    const pending = getNnsGovernanceCanister({ signer: SIGNER });
    await vi.waitFor(() => expect(LedgerIdentity.create).toHaveBeenCalledTimes(1));

    // Logout while the device picker is still open.
    clearLedgerIdentities();
    clearLedgerAgents();
    finishFirstConnection(firstIdentity);
    await pending;

    // The next session connects the same device again.
    await getNnsGovernanceCanister({ signer: SIGNER });

    expect(LedgerIdentity.create).toHaveBeenCalledTimes(2);
    expect(agentOf(0)).toEqual({ identity: firstIdentity });
    expect(agentOf(1)).toEqual({ identity: secondIdentity });
    expect(agentOf(1)).not.toBe(agentOf(0));
  });

  it('reuses the identity and the agent inside one session', async () => {
    vi.spyOn(LedgerIdentity, 'create').mockImplementation(async () => new MockLedgerIdentity());

    await getNnsGovernanceCanister({ signer: SIGNER });
    await getNnsGovernanceCanister({ signer: SIGNER });

    expect(LedgerIdentity.create).toHaveBeenCalledTimes(1);
    expect(createAgent).toHaveBeenCalledTimes(1);
    expect(agentOf(1)).toBe(agentOf(0));
  });
});
