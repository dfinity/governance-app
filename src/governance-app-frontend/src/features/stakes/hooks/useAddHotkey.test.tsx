import '@/i18n/config';

import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePendingDeviceAction } from '@hooks/useDeviceAction';
import { QUERY_KEYS } from '@utils/query';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
import { II_SIGNER } from '@common/ledger/signer';

import { useAddHotkey } from './useAddHotkey';

const mocks = vi.hoisted(() => ({
  addHotkey: vi.fn(),
  getNnsGovernanceCanister: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));

const HOTKEY = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
const DEVICE = 'aaaaa-aa';

const renderAddHotkey = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    ...renderHook(() => ({ mutation: useAddHotkey(), pending: usePendingDeviceAction() }), {
      wrapper,
    }),
    invalidateQueries,
  };
};

describe('useAddHotkey', () => {
  beforeEach(() => {
    mocks.addHotkey.mockReset().mockResolvedValue(undefined);
    mocks.getNnsGovernanceCanister.mockReset().mockResolvedValue({ addHotkey: mocks.addHotkey });
    clearDeviceApprovals();
  });

  it('signs with the Internet Identity session by default', async () => {
    const { result } = renderAddHotkey();

    await result.current.mutation.mutateAsync({ neuronId: 7n, principal: HOTKEY });

    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({ signer: II_SIGNER });
    expect(mocks.addHotkey).toHaveBeenCalledWith({
      neuronId: 7n,
      principal: Principal.fromText(HOTKEY),
    });
  });

  it('signs with the Ledger device of the signer', async () => {
    const { result } = renderAddHotkey();

    await result.current.mutation.mutateAsync({
      neuronId: 7n,
      principal: HOTKEY,
      signer: { kind: 'ledger', principal: DEVICE },
    });

    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({
      signer: { kind: 'ledger', principal: DEVICE },
    });
  });

  it('shows the approval dialog with the hotkey principal while the device signs', async () => {
    let settle: () => void = () => {};
    mocks.addHotkey.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
    const { result } = renderAddHotkey();

    let run!: Promise<void>;
    act(() => {
      run = result.current.mutation.mutateAsync({
        neuronId: 7n,
        principal: HOTKEY,
        signer: { kind: 'ledger', principal: DEVICE },
      });
    });

    await waitFor(() => expect(result.current.pending).not.toBeNull());
    expect(result.current.pending?.description).toBe(
      'Check the hotkey principal on the device screen and approve.',
    );
    render(<>{result.current.pending?.detail}</>);
    expect(screen.getByText(HOTKEY)).toBeTruthy();

    await act(async () => {
      settle();
      await run;
    });
    expect(result.current.pending).toBeNull();
  });

  it('refreshes the neurons list after the hotkey is added', async () => {
    const { result, invalidateQueries } = renderAddHotkey();

    await result.current.mutation.mutateAsync({ neuronId: 7n, principal: HOTKEY });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      }),
    );
  });

  it('rejects when the device call fails and refreshes nothing', async () => {
    mocks.addHotkey.mockRejectedValue(new Error('rejected'));
    const { result, invalidateQueries } = renderAddHotkey();

    await expect(
      result.current.mutation.mutateAsync({ neuronId: 7n, principal: HOTKEY }),
    ).rejects.toThrow('rejected');

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
