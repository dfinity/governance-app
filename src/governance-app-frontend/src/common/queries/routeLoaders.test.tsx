import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

const PRINCIPAL = Principal.fromText('2vxsx-fae');
const IDENTITY = { getPrincipal: () => PRINCIPAL };
const MAIN_ACCOUNT_ID = AccountIdentifier.fromPrincipal({ principal: PRINCIPAL }).toHex();
const SUB_ACCOUNT_ID = 'sub-account-id';
const DEVICE_ACCOUNT_ID = 'device-account-id';

const NEURONS: NeuronInfo[] = [
  mockNeuron({ neuronId: 1n, fullNeuron: { id: 1n, cachedNeuronStake: 100_000_000n } }),
];

const listNeurons = vi.fn(async () => NEURONS);
const accountBalance = vi.fn(async () => 42n);
const listProposals = vi.fn(async ({ certified }: { request: unknown; certified: boolean }) => ({
  proposals: [],
  certifiedLeg: certified,
}));
const getTransactions = vi.fn<
  (args: { accountIdentifier: string; maxResults: bigint; certified: boolean }) => Promise<{
    transactions: [];
  }>
>(async () => ({ transactions: [] }));
const getAccount = vi.fn(async () => ({
  Ok: {
    sub_accounts: [{ account_identifier: SUB_ACCOUNT_ID }],
    hardware_wallet_accounts: [{ account_identifier: DEVICE_ACCOUNT_ID }],
  },
}));
const getAddressBook = vi.fn(async () => ({ Ok: { named_addresses: [] } }));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: async () => ({ listNeurons, listProposals }),
  getIcpLedgerCanister: async () => ({ accountBalance }),
  getIcpIndexCanister: async () => ({ getTransactions }),
  getNnsDappActor: async () => ({ get_account: getAccount }),
  getGovernanceAppActor: async () => ({ get_address_book: getAddressBook }),
}));

vi.mock('@common/auth/internetIdentity', () => ({
  ensureInitialized: async () => IDENTITY,
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: IDENTITY }),
}));

vi.mock('@hooks/governance/useGovernance', () => ({
  useNnsGovernance: () => ({ ready: true, authenticated: true, canister: {} }),
}));

const READY_CANISTER = { ready: true, authenticated: true, canister: {} };

vi.mock('@hooks/icpLedger/useIcpLedger', () => ({ useIcpLedger: () => READY_CANISTER }));
vi.mock('@hooks/icpIndex/useIcpIndex', () => ({ useIcpIndex: () => READY_CANISTER }));
vi.mock('@hooks/nnsDapp/useNnsDapp', () => ({ useNnsDapp: () => READY_CANISTER }));
vi.mock('@hooks/addressBook/useGovernanceAppCanister', () => ({
  useGovernanceAppCanister: () => READY_CANISTER,
}));

const { useGovernanceNeurons } = await import('@hooks/governance/useGovernanceNeurons');
const { useAddressBook } = await import('@hooks/addressBook/useAddressBook');
const { useIcpIndexAccountsTransactions } =
  await import('@hooks/icpIndex/useIcpIndexAccountsTransactions');
const { useIcpLedgerAccountsBalances } =
  await import('@hooks/icpLedger/useIcpLedgerAccountsBalances');
const { useNnsDappAccount } = await import('@hooks/nnsDapp/useNnsDappAccount');
const { prefetchAccountsRoute, prefetchNeuronsRoute, prefetchVotingRoute } =
  await import('./routeLoaders');

// Mirrors `queryClientConfig`. The staleTime matters: it is what makes the
// mounting hook adopt the prefetched entry instead of revalidating it.
const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } } });

const wrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('route loader prefetching', () => {
  beforeEach(() => {
    listNeurons.mockClear();
    accountBalance.mockClear();
    listProposals.mockClear();
    getTransactions.mockClear();
    getAccount.mockClear();
    getAddressBook.mockClear();
  });

  it('warms exactly the cache entries the neurons hook goes on to read.', async () => {
    const queryClient = testQueryClient();

    await prefetchNeuronsRoute(queryClient);
    // Both legs of both certified pairs. The prefetches are not awaited, so
    // both counts have to be waited on together.
    await waitFor(() => {
      expect(listNeurons).toHaveBeenCalledTimes(2);
      expect(accountBalance).toHaveBeenCalledTimes(2);
    });

    const { result } = renderHook(() => useGovernanceNeurons(), {
      wrapper: wrapper(queryClient),
    });

    // The hook has to land on the prefetched keys. A drifted key would show up
    // here as a third `listNeurons` call and an initially empty result.
    await waitFor(() => expect(result.current.data?.response).toEqual(NEURONS));
    expect(listNeurons).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('leaves the proposals list alone while it is collapsed.', async () => {
    const queryClient = testQueryClient();

    await prefetchVotingRoute(queryClient, { proposals: 'none' });

    // Following data still loads — it is on screen either way.
    await waitFor(() => expect(listNeurons).toHaveBeenCalledTimes(2));
    // The list is behind a toggle, so warming it would reinstate the two
    // certified calls the component's `enabled` gate exists to avoid.
    expect(listProposals).not.toHaveBeenCalled();
  });

  it('warms one filter, not both, once the list is expanded.', async () => {
    const queryClient = testQueryClient();

    await prefetchVotingRoute(queryClient, { proposals: 'open' });

    await waitFor(() => expect(listProposals).toHaveBeenCalledTimes(2));

    const certified = listProposals.mock.calls.map(([args]) => args.certified);
    expect(certified.toSorted()).toEqual([false, true]);
  });

  describe('accounts route', () => {
    const ALL_ACCOUNT_IDS = [MAIN_ACCOUNT_ID, SUB_ACCOUNT_ID, DEVICE_ACCOUNT_ID];

    const accountsOf = (calls: [{ accountIdentifier: string }][]) =>
      new Set(calls.map(([{ accountIdentifier }]) => accountIdentifier));

    it('warms exactly the cache entries that the accounts hooks go on to read.', async () => {
      const queryClient = testQueryClient();

      await prefetchAccountsRoute(queryClient, { subaccounts: true, ledgerDevice: true });
      // Each account has two legs of balance and two legs of transactions.
      await waitFor(() => {
        expect(accountBalance).toHaveBeenCalledTimes(6);
        expect(getTransactions).toHaveBeenCalledTimes(6);
      });
      expect(getAccount).toHaveBeenCalledTimes(2);
      expect(getAddressBook).toHaveBeenCalledTimes(2);
      expect(listNeurons).toHaveBeenCalledTimes(2);

      const { result } = renderHook(
        () => ({
          account: useNnsDappAccount(),
          addressBook: useAddressBook(),
          balances: useIcpLedgerAccountsBalances({ accountIds: ALL_ACCOUNT_IDS }),
          transactions: useIcpIndexAccountsTransactions({ accountIds: ALL_ACCOUNT_IDS }),
        }),
        { wrapper: wrapper(queryClient) },
      );

      await waitFor(() => {
        expect(result.current.account.isSuccess).toBe(true);
        expect(result.current.addressBook.isSuccess).toBe(true);
        expect(result.current.balances.isLoading).toBe(false);
        expect(result.current.transactions.isLoading).toBe(false);
      });

      // A drifted key would show up here as an extra call.
      expect(accountBalance).toHaveBeenCalledTimes(6);
      expect(getTransactions).toHaveBeenCalledTimes(6);
      expect(getAccount).toHaveBeenCalledTimes(2);
      expect(getAddressBook).toHaveBeenCalledTimes(2);
    });

    it('reads only the short transaction lists on the page.', async () => {
      await prefetchAccountsRoute(testQueryClient(), { subaccounts: true, ledgerDevice: true });

      await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(6));

      expect(getTransactions.mock.calls.every(([{ maxResults }]) => maxResults === 5n)).toBe(true);
    });

    it('skips the accounts of a disabled feature.', async () => {
      await prefetchAccountsRoute(testQueryClient(), { subaccounts: false, ledgerDevice: true });

      await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(4));

      expect(accountsOf(getTransactions.mock.calls)).toEqual(
        new Set([MAIN_ACCOUNT_ID, DEVICE_ACCOUNT_ID]),
      );
    });

    it('still warms the main account if the NNS dapp account call fails.', async () => {
      getAccount.mockRejectedValue(new Error('unavailable'));

      await prefetchAccountsRoute(testQueryClient(), { subaccounts: true, ledgerDevice: true });

      await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(2));

      expect(accountsOf(getTransactions.mock.calls)).toEqual(new Set([MAIN_ACCOUNT_ID]));
      getAccount.mockReset();
    });
  });
});
