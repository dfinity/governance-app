import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

const PRINCIPAL = Principal.fromText('2vxsx-fae');
const IDENTITY = { getPrincipal: () => PRINCIPAL };

const NEURONS: NeuronInfo[] = [
  mockNeuron({ neuronId: 1n, fullNeuron: { id: 1n, cachedNeuronStake: 100_000_000n } }),
];

const listNeurons = vi.fn(async () => NEURONS);
const accountBalance = vi.fn(async () => 42n);

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: async () => ({ listNeurons }),
  getIcpLedgerCanister: async () => ({ accountBalance }),
}));

vi.mock('ic-use-internet-identity', () => ({
  ensureInitialized: async () => IDENTITY,
  useInternetIdentity: () => ({ identity: IDENTITY }),
}));

vi.mock('@hooks/governance/useGovernance', () => ({
  useNnsGovernance: () => ({ ready: true, authenticated: true, canister: {} }),
}));

const { useGovernanceNeurons } = await import('@hooks/governance/useGovernanceNeurons');
const { prefetchNeuronsRoute } = await import('./routeLoaders');

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
});
