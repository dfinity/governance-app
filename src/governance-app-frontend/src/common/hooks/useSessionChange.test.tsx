import type { Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionEnd } from '@common/auth/internetIdentity';

const { invalidate, infoNotification, session } = vi.hoisted(() => ({
  invalidate: vi.fn(async () => undefined),
  infoNotification: vi.fn(),
  session: {
    identity: undefined as Identity | undefined,
    sessionEnd: undefined as SessionEnd | undefined,
  },
}));

vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate }) }));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: session.identity, sessionEnd: session.sessionEnd }),
}));

vi.mock('@utils/notification', () => ({ infoNotification }));

const { useSessionChange } = await import('./useSessionChange');

const renderSessionChange = (identity: Identity | undefined) => {
  session.identity = identity;
  session.sessionEnd = undefined;
  const queryClient = new QueryClient();
  const resetQueries = vi.spyOn(queryClient, 'resetQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { rerender } = renderHook(() => useSessionChange(), { wrapper });

  const switchTo = (next: Identity | undefined, sessionEnd?: SessionEnd) => {
    session.identity = next;
    session.sessionEnd = sessionEnd;
    rerender();
  };

  return { resetQueries, switchTo };
};

describe('useSessionChange', () => {
  beforeEach(() => {
    invalidate.mockClear();
    infoNotification.mockClear();
  });

  it('resets the cached queries when another tab switches the account.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    switchTo(Ed25519KeyIdentity.generate());

    await waitFor(() => expect(resetQueries).toHaveBeenCalledTimes(1));
    expect(infoNotification).not.toHaveBeenCalled();
  });

  it('resets the cached queries and tells the user when the session expires.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    switchTo(undefined, 'expiry');

    await waitFor(() => expect(infoNotification).toHaveBeenCalledTimes(1));
    expect(resetQueries).toHaveBeenCalledTimes(1);
  });

  it('resets the cached queries without a notice on a manual logout.', async () => {
    const { resetQueries, switchTo } = renderSessionChange(Ed25519KeyIdentity.generate());

    switchTo(undefined, 'logout');

    await waitFor(() => expect(resetQueries).toHaveBeenCalledTimes(1));
    expect(infoNotification).not.toHaveBeenCalled();
  });

  it('shows no notice in any tab on a manual logout.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const firstTab = renderSessionChange(identity);
    const secondTab = renderSessionChange(identity);

    // The logout in one tab ends the session in both.
    firstTab.switchTo(undefined, 'logout');
    secondTab.switchTo(undefined, 'logout');

    await waitFor(() => expect(firstTab.resetQueries).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(secondTab.resetQueries).toHaveBeenCalledTimes(1));
    expect(infoNotification).not.toHaveBeenCalled();
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
