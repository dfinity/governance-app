import { Principal } from '@icp-sdk/core/principal';
import { describe, expect, it, vi } from 'vitest';

// Own file: the module cache lives in `session.ts`, so this file starts with nothing loaded.
const PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

describe('getLedgerIdentity module load', () => {
  it('stops a connection whose module load was pending when the identities cleared', async () => {
    let finishLoad: (module: unknown) => void = () => undefined;
    const create = vi.fn();
    const load = new Promise<unknown>((resolve) => {
      finishLoad = resolve;
    });
    vi.doMock('./ledgerIdentity', () => load as Promise<Record<string, unknown>>);
    const { clearLedgerIdentities, getLedgerIdentity } = await import('./session');

    const pending = getLedgerIdentity(PRINCIPAL).catch((error: unknown) => error);
    await new Promise((resolve) => setTimeout(resolve, 0));
    clearLedgerIdentities();
    finishLoad({ LedgerIdentity: { create, closeSession: vi.fn() } });

    expect(await pending).toMatchObject({ code: 'sessionClosed' });
    expect(create).not.toHaveBeenCalled();
    vi.doUnmock('./ledgerIdentity');
  });

  it('forgets a failed load and succeeds on the next call', async () => {
    vi.resetModules();
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
