import { Principal } from '@icp-sdk/core/principal';
import { describe, expect, it, vi } from 'vitest';

// Own file: the module cache lives in `session.ts`, so this file starts with nothing loaded.
const PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

describe('getLedgerIdentity module load', () => {
  it('forgets a failed load and succeeds on the next call', async () => {
    vi.doMock('./ledgerIdentity', () => {
      throw new Error('load failed');
    });
    const { getLedgerIdentity } = await import('./session');

    // Vitest wraps a failed mock factory in its own error message.
    await expect(getLedgerIdentity(PRINCIPAL)).rejects.toThrow();

    vi.doUnmock('./ledgerIdentity');
    const create = vi.fn(async () => ({ getPrincipal: () => Principal.fromText(PRINCIPAL) }));
    vi.doMock('./ledgerIdentity', () => ({ LedgerIdentity: { create, closeSession: vi.fn() } }));

    const identity = await getLedgerIdentity(PRINCIPAL);

    expect(identity.getPrincipal().toText()).toBe(PRINCIPAL);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
