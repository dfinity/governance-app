import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import type { ReportEntity } from '../utils/transactionsCsv';
import { useYearSummary } from './useYearSummary';

const mocks = vi.hoisted(() => ({
  loadReportNeurons: vi.fn(),
  loadEntityHistories: vi.fn(),
}));

vi.mock('../utils/loadReportData', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/loadReportData')>()),
  loadReportNeurons: mocks.loadReportNeurons,
  loadNnsDappAccounts: async () => ({ subAccounts: [], hardwareWallets: [] }),
  loadReportRates: async () => () => undefined,
  loadEntityHistories: mocks.loadEntityHistories,
}));
vi.mock('@hooks/useInternetIdentity', async () => {
  const { Ed25519KeyIdentity } = await import('@icp-sdk/core/identity');
  const identity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(3));
  return { useInternetIdentity: () => ({ identity }) };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useYearSummary', () => {
  it('leaves out the neurons where the user is only a hotkey', async () => {
    const { useInternetIdentity } = await import('@hooks/useInternetIdentity');
    const principal = useInternetIdentity().identity!.getPrincipal().toText();
    mocks.loadReportNeurons.mockResolvedValue([
      mockNeuron({
        neuronId: 1n,
        fullNeuron: { controller: principal, accountIdentifier: 'own-neuron' },
      }),
      mockNeuron({
        neuronId: 2n,
        fullNeuron: { controller: 'someone-else', hotKeys: [principal], accountIdentifier: 'x' },
      }),
    ]);
    mocks.loadEntityHistories.mockResolvedValue({ histories: [], complete: true });

    const { result } = renderHook(() => useYearSummary(2025), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [{ entities }] = mocks.loadEntityHistories.mock.calls[0] as [
      { entities: ReportEntity[] },
    ];
    expect(entities.filter(({ kind }) => kind === 'neuron')).toEqual([
      { kind: 'neuron', accountId: 'own-neuron', neuronId: 1n },
    ]);
  });
});
