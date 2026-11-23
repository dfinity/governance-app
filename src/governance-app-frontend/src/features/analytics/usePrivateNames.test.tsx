import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { nonCertifiedQueryKey } from '@common/queries/certified';

import { usePrivateNames } from './usePrivateNames';

const mocks = vi.hoisted(() => ({
  getAddressBook: vi.fn(),
  getAccount: vi.fn(),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: { getPrincipal: () => ({ toText: () => 'aaaaa-aa' }) } }),
}));
vi.mock('@hooks/addressBook/useGovernanceAppCanister', () => ({
  useGovernanceAppCanister: () => ({ ready: true, authenticated: true }),
}));
vi.mock('@hooks/nnsDapp/useNnsDapp', () => ({
  useNnsDapp: () => ({ ready: true, authenticated: true }),
}));
vi.mock('@common/queries/addressBook', () => ({
  addressBookQuery: (principal: string) => ({
    queryKey: ['addressBook', principal],
    queryFn: mocks.getAddressBook,
    updateFn: vi.fn(),
  }),
}));
vi.mock('@common/queries/nnsDapp', () => ({
  nnsDappAccountQuery: () => ({
    queryKey: ['nnsDappAccount'],
    queryFn: mocks.getAccount,
    updateFn: vi.fn(),
  }),
}));

const addressBook = (...names: string[]) => ({
  named_addresses: names.map((name) => ({ name })),
});

const account = {
  sub_accounts: [{ name: 'Savings' }],
  hardware_wallet_accounts: [{ name: 'Cold storage' }],
};

const renderPrivateNames = (client = new QueryClient()) =>
  renderHook(({ open }: { open: boolean }) => usePrivateNames(open), {
    initialProps: { open: true },
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

describe('usePrivateNames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAddressBook.mockResolvedValue(addressBook('Alice'));
    mocks.getAccount.mockResolvedValue(account);
  });

  it('returns the address book and account names.', async () => {
    const { result } = renderPrivateNames();

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toEqual(['Alice', 'Savings', 'Cold storage']));
  });

  it('returns the address book names when the user has no NNS dapp account.', async () => {
    mocks.getAccount.mockResolvedValue(null);
    const { result } = renderPrivateNames();

    await waitFor(() => expect(result.current).toEqual(['Alice']));
  });

  it('reads the names again instead of the cached names.', async () => {
    const client = new QueryClient();
    client.setQueryData(nonCertifiedQueryKey(['addressBook', 'aaaaa-aa']), {
      response: addressBook('Old'),
      certified: false,
    });
    client.setQueryData(nonCertifiedQueryKey(['nnsDappAccount']), {
      response: account,
      certified: false,
    });
    mocks.getAddressBook.mockResolvedValue(addressBook('New'));

    const { result } = renderPrivateNames(client);

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toEqual(['New', 'Savings', 'Cold storage']));
    expect(mocks.getAddressBook).toHaveBeenCalledOnce();
  });

  it('does not join a read that started before the mount.', async () => {
    const client = new QueryClient();
    let resolveOldRead: (value: unknown) => void = () => {};
    void client.fetchQuery({
      queryKey: nonCertifiedQueryKey(['addressBook', 'aaaaa-aa']),
      queryFn: () =>
        new Promise((resolve) => {
          resolveOldRead = resolve;
        }),
    });
    mocks.getAddressBook.mockResolvedValue(addressBook('New'));

    const { result } = renderPrivateNames(client);

    await waitFor(() => expect(result.current).toEqual(['New', 'Savings', 'Cold storage']));
    resolveOldRead({ response: addressBook('Old'), certified: false });
  });

  it('reads the names again when the palette opens again before it unmounts.', async () => {
    const { result, rerender } = renderPrivateNames();
    await waitFor(() => expect(result.current).toEqual(['Alice', 'Savings', 'Cold storage']));

    mocks.getAddressBook.mockResolvedValue(addressBook('Alice', 'Bob'));
    rerender({ open: false });
    rerender({ open: true });

    expect(result.current).toBeUndefined();
    await waitFor(() =>
      expect(result.current).toEqual(['Alice', 'Bob', 'Savings', 'Cold storage']),
    );
    expect(mocks.getAddressBook).toHaveBeenCalledTimes(2);
  });

  it('returns no names when a read fails.', async () => {
    mocks.getAccount.mockRejectedValue(new Error('offline'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderPrivateNames(client);

    await waitFor(() => expect(mocks.getAccount).toHaveBeenCalled());
    await waitFor(() => expect(mocks.getAddressBook).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
