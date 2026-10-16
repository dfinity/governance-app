import { Principal } from '@icp-sdk/core/principal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const II_PRINCIPAL = Principal.fromText(
  'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe',
);
const DEVICE_PRINCIPAL = '2vxsx-fae';

const II_IDENTITY = { getPrincipal: () => II_PRINCIPAL };
const LEDGER_IDENTITY = { getPrincipal: () => Principal.fromText(DEVICE_PRINCIPAL) };

const ANONYMOUS_AGENT = { name: 'anonymous' };
const AUTHENTICATED_AGENT = { name: 'authenticated' };
const LEDGER_AGENT = { name: 'ledger' };

const getLedgerIdentity = vi.hoisted(() => vi.fn());
const getLedgerAgent = vi.hoisted(() => vi.fn());
const governanceCreate = vi.hoisted(() => vi.fn());
const ledgerCreate = vi.hoisted(() => vi.fn());

vi.mock('ic-use-internet-identity', () => ({ ensureInitialized: async () => II_IDENTITY }));
vi.mock('@common/ledger/session', () => ({ getLedgerIdentity }));
vi.mock('./agents', () => ({
  getAnonymousAgent: async () => ANONYMOUS_AGENT,
  getAuthenticatedAgent: async () => AUTHENTICATED_AGENT,
  getLedgerAgent,
}));
vi.mock('@icp-sdk/canisters/nns', () => ({
  NnsGovernanceCanister: { create: governanceCreate },
}));
vi.mock('@icp-sdk/canisters/ledger/icp', () => ({
  IcpLedgerCanister: { create: ledgerCreate },
}));

const { getAnonymousNnsGovernanceCanister, getIcpLedgerCanister, getNnsGovernanceCanister } =
  await import('./index');

const agentOf = (create: typeof governanceCreate) => create.mock.calls[0][0].agent;

describe('canister factories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLedgerIdentity.mockResolvedValue(LEDGER_IDENTITY);
    getLedgerAgent.mockResolvedValue(LEDGER_AGENT);
  });

  it('binds the governance canister to the session agent by default', async () => {
    await getNnsGovernanceCanister();

    expect(agentOf(governanceCreate)).toBe(AUTHENTICATED_AGENT);
    expect(getLedgerIdentity).not.toHaveBeenCalled();
  });

  it('binds the governance canister to the session agent for the II signer', async () => {
    await getNnsGovernanceCanister({ signer: { kind: 'ii' } });

    expect(agentOf(governanceCreate)).toBe(AUTHENTICATED_AGENT);
    expect(getLedgerIdentity).not.toHaveBeenCalled();
  });

  it('binds the governance canister to the device agent for a Ledger signer', async () => {
    await getNnsGovernanceCanister({ signer: { kind: 'ledger', principal: DEVICE_PRINCIPAL } });

    expect(getLedgerIdentity).toHaveBeenCalledWith(DEVICE_PRINCIPAL);
    expect(getLedgerAgent).toHaveBeenCalledWith(LEDGER_IDENTITY);
    expect(agentOf(governanceCreate)).toBe(LEDGER_AGENT);
  });

  it('binds the ICP ledger canister to the device agent for a Ledger signer', async () => {
    await getIcpLedgerCanister({ signer: { kind: 'ledger', principal: DEVICE_PRINCIPAL } });

    expect(agentOf(ledgerCreate)).toBe(LEDGER_AGENT);
  });

  it('binds the anonymous governance canister to the anonymous agent', async () => {
    await getAnonymousNnsGovernanceCanister();

    expect(agentOf(governanceCreate)).toBe(ANONYMOUS_AGENT);
    expect(getLedgerIdentity).not.toHaveBeenCalled();
  });

  it('does not create a canister when the device connection fails', async () => {
    getLedgerIdentity.mockRejectedValueOnce(new Error('no device'));

    await expect(
      getNnsGovernanceCanister({ signer: { kind: 'ledger', principal: DEVICE_PRINCIPAL } }),
    ).rejects.toThrow('no device');
    expect(governanceCreate).not.toHaveBeenCalled();
  });
});
