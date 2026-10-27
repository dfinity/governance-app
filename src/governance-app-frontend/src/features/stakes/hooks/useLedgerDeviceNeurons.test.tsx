import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { useLedgerDeviceNeurons } from './useLedgerDeviceNeurons';

const mocks = vi.hoisted(() => ({
  listNeurons: vi.fn(),
  getNnsGovernanceCanister: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));

const DEVICE = 'aaaaa-aa';
const OTHER = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

const renderNeurons = (session = 1) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useLedgerDeviceNeurons({ principal: DEVICE, session, enabled: true }), {
    wrapper,
  });
};

describe('useLedgerDeviceNeurons', () => {
  beforeEach(() => {
    mocks.getNnsGovernanceCanister
      .mockReset()
      .mockResolvedValue({ listNeurons: mocks.listNeurons });
  });

  it('lists the neurons with the device as signer', async () => {
    mocks.listNeurons.mockResolvedValue([
      mockNeuron({ neuronId: 1n, fullNeuron: { controller: DEVICE } }),
    ]);

    const { result } = renderNeurons();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({
      signer: { kind: 'ledger', principal: DEVICE },
    });
    expect(mocks.listNeurons).toHaveBeenCalledWith({
      certified: true,
      includeEmptyNeurons: undefined,
    });
    expect(result.current.data?.map((n) => n.neuronId)).toEqual([1n]);
  });

  it('drops the neurons where the device is only a hotkey', async () => {
    mocks.listNeurons.mockResolvedValue([
      mockNeuron({ neuronId: 1n, fullNeuron: { controller: DEVICE } }),
      mockNeuron({ neuronId: 2n, fullNeuron: { controller: OTHER, hotKeys: [DEVICE] } }),
      mockNeuron({ neuronId: 3n, fullNeuron: undefined }),
    ]);

    const { result } = renderNeurons();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((n) => n.neuronId)).toEqual([1n]);
  });
});
