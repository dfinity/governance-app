import type { Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

const { invalidate, infoNotification, session } = vi.hoisted(() => ({
  invalidate: vi.fn(async () => undefined),
  infoNotification: vi.fn(),
  session: { identity: undefined as Identity | undefined },
}));

vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate }) }));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: session.identity }),
}));

vi.mock('@utils/notification', () => ({ infoNotification }));

const { useSessionChange } = await import('./useSessionChange');

const storage = new Map<string, string>();

const renderSessionChange = (identity: Identity | undefined) => {
  session.identity = identity;
  const queryClient = new QueryClient();
  const resetQueries = vi.spyOn(queryClient, 'resetQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { rerender } = renderHook(() => useSessionChange(), { wrapper });

  const switchTo = (next: Identity | undefined) => {
    session.identity = next;
    rerender();
  };

  return { resetQueries, switchTo };
};

describe('useSessionChange', () => {
  beforeEach(() => {
    invalidate.mockClear();
    infoNotification.mockClear();
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });

  it('resets the cached queries when another tab switches the account.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    switchTo(Ed25519KeyIdentity.generate());

    await waitFor(() => expect(resetQueries).toHaveBeenCalledTimes(1));
    expect(infoNotification).not.toHaveBeenCalled();
  });

  it('resets the cached queries and tells the user when the session expires.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    switchTo(undefined);

    await waitFor(() => expect(infoNotification).toHaveBeenCalledTimes(1));
    expect(resetQueries).toHaveBeenCalledTimes(1);
  });

  it('resets the cached queries without a notice on a manual logout.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    storage.set(MANUAL_LOGOUT_KEY, 'true');
    switchTo(undefined);

    await waitFor(() => expect(resetQueries).toHaveBeenCalledTimes(1));
    expect(infoNotification).not.toHaveBeenCalled();
    expect(storage.has(MANUAL_LOGOUT_KEY)).toBe(false);
  });

  it('keeps the cached queries when the same account gets a new identity object.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const { resetQueries, switchTo } = renderSessionChange(identity);
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));

    switchTo(Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(resetQueries).not.toHaveBeenCalled();
  });

  it('runs the route guards again on a login.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(undefined);
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));

    switchTo(Ed25519KeyIdentity.generate());

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(resetQueries).not.toHaveBeenCalled();
  });
});
