import '@/i18n/config';

import { UnrecognizedTypeError } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@utils/query';

import { useClaimPendingDeviceStakes } from './useClaimPendingDeviceStakes';

const DEVICE = 'aaaaa-aa';
const OTHER = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

const mocks = vi.hoisted(() => ({
  claimOrRefreshNeuronFromAccount: vi.fn(),
  getAnonymousNnsGovernanceCanister: vi.fn(),
  claimOrRefreshNeuron: vi.fn(),
  readAllPendingDeviceStakes: vi.fn(),
  clearPendingDeviceStake: vi.fn(),
  readAllPendingDeviceTopUps: vi.fn(),
  clearPendingDeviceTopUp: vi.fn(),
  successNotification: vi.fn(),
  runOnDevice: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getAnonymousNnsGovernanceCanister: mocks.getAnonymousNnsGovernanceCanister,
}));
vi.mock('../utils/pendingDeviceStake', () => ({
  readAllPendingDeviceStakes: mocks.readAllPendingDeviceStakes,
  clearPendingDeviceStake: mocks.clearPendingDeviceStake,
}));
vi.mock('../utils/pendingDeviceTopUp', () => ({
  readAllPendingDeviceTopUps: mocks.readAllPendingDeviceTopUps,
  clearPendingDeviceTopUp: mocks.clearPendingDeviceTopUp,
}));
vi.mock('@utils/notification', () => ({ successNotification: mocks.successNotification }));
vi.mock('@common/ledger/deviceQueue', () => ({ runOnDevice: mocks.runOnDevice }));

const renderClaim = (enabled = true) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    ...renderHook(() => useClaimPendingDeviceStakes(enabled), { wrapper }),
    invalidateQueries,
  };
};

describe('useClaimPendingDeviceStakes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.getAnonymousNnsGovernanceCanister.mockResolvedValue({
      claimOrRefreshNeuronFromAccount: mocks.claimOrRefreshNeuronFromAccount,
      claimOrRefreshNeuron: mocks.claimOrRefreshNeuron,
    });
    mocks.readAllPendingDeviceStakes.mockReturnValue({});
    mocks.readAllPendingDeviceTopUps.mockReturnValue({});
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
  });

  it('does nothing without a record', async () => {
    renderClaim();

    await waitFor(() => expect(mocks.readAllPendingDeviceStakes).toHaveBeenCalled());
    expect(mocks.getAnonymousNnsGovernanceCanister).not.toHaveBeenCalled();
  });

  it('claims each record anonymously, forgets it, and tells the user about a claimed neuron', async () => {
    mocks.readAllPendingDeviceStakes.mockReturnValue({
      [DEVICE]: { memo: '7', amount: '25' },
      [OTHER]: { memo: '8', amount: '1' },
    });
    mocks.claimOrRefreshNeuronFromAccount
      .mockResolvedValueOnce(42n)
      .mockResolvedValueOnce(undefined);
    const { invalidateQueries } = renderClaim();

    await waitFor(() => expect(mocks.clearPendingDeviceStake).toHaveBeenCalledTimes(2));
    expect(mocks.clearPendingDeviceStake).toHaveBeenCalledWith(DEVICE, '7');
    // Each claim waits in the queue of its device, behind a transfer the device may still sign.
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE, expect.any(Function));
    expect(mocks.runOnDevice).toHaveBeenCalledWith(OTHER, expect.any(Function));
    expect(mocks.claimOrRefreshNeuronFromAccount).toHaveBeenCalledWith({
      controller: Principal.fromText(DEVICE),
      memo: 7n,
    });
    await waitFor(() => expect(mocks.successNotification).toHaveBeenCalledTimes(1));
    expect(mocks.successNotification.mock.calls[0][0].description).toContain('25 ICP');
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
    });
  });

  it('forgets a record whose sub-account holds no ICP', async () => {
    mocks.readAllPendingDeviceStakes.mockReturnValue({ [DEVICE]: { memo: '7', amount: '25' } });
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(
      new UnrecognizedTypeError(
        'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_message":"not enough funds","error_type":10}}]}',
      ),
    );
    renderClaim();

    await waitFor(() => expect(mocks.clearPendingDeviceStake).toHaveBeenCalledWith(DEVICE, '7'));
    expect(mocks.successNotification).not.toHaveBeenCalled();
  });

  it('keeps a record whose claim answered with another governance error', async () => {
    mocks.readAllPendingDeviceStakes.mockReturnValue({ [DEVICE]: { memo: '7', amount: '25' } });
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(
      new UnrecognizedTypeError(
        'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_type":5}}]}',
      ),
    );
    renderClaim();

    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(mocks.clearPendingDeviceStake).not.toHaveBeenCalled();
  });

  it('refreshes the neurons of the top-ups that no view refreshed, and forgets them', async () => {
    mocks.readAllPendingDeviceTopUps.mockReturnValue({
      'key-a': { neuronId: '42', amount: '5' },
      'key-b': { neuronId: '43', amount: '6' },
    });
    mocks.claimOrRefreshNeuron.mockResolvedValueOnce(42n).mockRejectedValueOnce(new Error('x'));
    const { invalidateQueries } = renderClaim();

    await waitFor(() => expect(mocks.claimOrRefreshNeuron).toHaveBeenCalledTimes(2));
    expect(mocks.claimOrRefreshNeuron).toHaveBeenCalledWith({
      neuronId: 42n,
      by: { NeuronIdOrSubaccount: {} },
    });
    await waitFor(() => expect(mocks.clearPendingDeviceTopUp).toHaveBeenCalledWith('key-a'));
    expect(mocks.clearPendingDeviceTopUp).not.toHaveBeenCalledWith('key-b');
    await waitFor(() => expect(mocks.successNotification).toHaveBeenCalledTimes(1));
    expect(mocks.successNotification.mock.calls[0][0].description).toContain('5 ICP');
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it('keeps a record whose claim failed', async () => {
    mocks.readAllPendingDeviceStakes.mockReturnValue({ [DEVICE]: { memo: '7', amount: '25' } });
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(new Error('offline'));
    renderClaim();

    await waitFor(() => expect(mocks.claimOrRefreshNeuronFromAccount).toHaveBeenCalled());
    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(mocks.clearPendingDeviceStake).not.toHaveBeenCalled();
    expect(mocks.successNotification).not.toHaveBeenCalled();
  });

  it('waits until enabled', async () => {
    mocks.readAllPendingDeviceStakes.mockReturnValue({ [DEVICE]: { memo: '7', amount: '25' } });
    const { rerender } = renderHook(({ enabled }) => useClaimPendingDeviceStakes(enabled), {
      initialProps: { enabled: false },
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
      ),
    });

    expect(mocks.readAllPendingDeviceStakes).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(mocks.claimOrRefreshNeuronFromAccount).toHaveBeenCalled());
  });
});
