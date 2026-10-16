import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createAgent = vi.hoisted(() => vi.fn());
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  createAgent,
}));

const { clearLedgerAgents, getAuthenticatedAgent, getLedgerAgent } = await import('./agents');

const identityOf = (principal: string): Identity =>
  ({ getPrincipal: () => Principal.fromText(principal) }) as Identity;

const DEVICE_A = identityOf('2vxsx-fae');
const DEVICE_B = identityOf('rrkah-fqaaa-aaaaa-aaaaq-cai');

describe('getLedgerAgent', () => {
  beforeEach(() => {
    createAgent.mockImplementation(async ({ identity }: { identity: Identity }) => ({
      principal: identity.getPrincipal().toText(),
    }));
  });

  afterEach(() => {
    clearLedgerAgents();
    createAgent.mockReset();
  });

  it('creates one agent per device principal', async () => {
    const first = await getLedgerAgent(DEVICE_A);
    const second = await getLedgerAgent(DEVICE_A);

    expect(second).toBe(first);
    expect(createAgent).toHaveBeenCalledTimes(1);
    expect(createAgent).toHaveBeenCalledWith(expect.objectContaining({ identity: DEVICE_A }));
  });

  it('keeps separate agents for separate devices', async () => {
    const a = await getLedgerAgent(DEVICE_A);
    const b = await getLedgerAgent(DEVICE_B);

    expect(b).not.toBe(a);
    expect(createAgent).toHaveBeenCalledTimes(2);
  });

  it('shares the pending agent between parallel calls', async () => {
    const [first, second] = await Promise.all([getLedgerAgent(DEVICE_A), getLedgerAgent(DEVICE_A)]);

    expect(second).toBe(first);
    expect(createAgent).toHaveBeenCalledTimes(1);
  });

  it('creates a new agent after clearLedgerAgents', async () => {
    const first = await getLedgerAgent(DEVICE_A);
    clearLedgerAgents();
    const second = await getLedgerAgent(DEVICE_A);

    expect(second).not.toBe(first);
    expect(createAgent).toHaveBeenCalledTimes(2);
  });

  it('does not share the cache with the authenticated agent', async () => {
    const ledger = await getLedgerAgent(DEVICE_A);
    const authenticated = await getAuthenticatedAgent(DEVICE_A);

    expect(authenticated).not.toBe(ledger);
    expect(createAgent).toHaveBeenCalledTimes(2);
  });
});
