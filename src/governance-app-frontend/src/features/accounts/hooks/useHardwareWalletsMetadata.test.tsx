import { Principal } from '@icp-sdk/core/principal';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '../types';
import { useHardwareWalletsMetadata } from './useHardwareWalletsMetadata';

const mocks = vi.hoisted(() => ({
  nnsDappAccount: vi.fn(),
  advancedFeatures: vi.fn(),
}));

vi.mock('@hooks/nnsDapp/useNnsDappAccount', () => ({ useNnsDappAccount: mocks.nnsDappAccount }));
vi.mock('@hooks/useAdvancedFeatures', () => ({ useAdvancedFeatures: mocks.advancedFeatures }));

const DEVICE = {
  name: 'Nano X',
  principal: Principal.fromText('aaaaa-aa'),
  account_identifier: 'd4685b31',
};

const mockFeatures = (features: { subaccounts?: boolean; ledgerDevice?: boolean }) =>
  mocks.advancedFeatures.mockReturnValue({
    features: { subaccounts: false, ledgerDevice: false, ...features },
  });

describe('useHardwareWalletsMetadata', () => {
  beforeEach(() => {
    mocks.nnsDappAccount.mockReturnValue({
      data: { response: { sub_accounts: [], hardware_wallet_accounts: [DEVICE] } },
      isLoading: false,
    });
  });

  it('maps the registered devices when the ledgerDevice feature is on', () => {
    mockFeatures({ ledgerDevice: true });

    const { result } = renderHook(() => useHardwareWalletsMetadata());

    expect(result.current.data).toEqual([
      {
        name: 'Nano X',
        accountId: 'd4685b31',
        type: AccountType.HardwareWallet,
        principal: 'aaaaa-aa',
      },
    ]);
    expect(mocks.nnsDappAccount).toHaveBeenCalledWith(true);
  });

  it('returns no device and does not fetch when both features are off', () => {
    mockFeatures({});

    const { result } = renderHook(() => useHardwareWalletsMetadata());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mocks.nnsDappAccount).toHaveBeenCalledWith(false);
  });

  it('shares the fetch with the subaccounts feature but keeps the devices hidden', () => {
    mockFeatures({ subaccounts: true });

    const { result } = renderHook(() => useHardwareWalletsMetadata());

    expect(result.current.data).toEqual([]);
    expect(mocks.nnsDappAccount).toHaveBeenCalledWith(true);
  });

  it('reports an error only while the ledgerDevice feature is on', () => {
    const refetch = vi.fn();
    mocks.nnsDappAccount.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    mockFeatures({ ledgerDevice: true });
    const { result } = renderHook(() => useHardwareWalletsMetadata());
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.refetch).toBe(refetch);

    mockFeatures({ subaccounts: true });
    expect(renderHook(() => useHardwareWalletsMetadata()).result.current.isError).toBe(false);
  });

  it('reports loading only while the ledgerDevice feature is on', () => {
    mocks.nnsDappAccount.mockReturnValue({ data: undefined, isLoading: true });

    mockFeatures({ ledgerDevice: true });
    expect(renderHook(() => useHardwareWalletsMetadata()).result.current.isLoading).toBe(true);

    mockFeatures({ subaccounts: true });
    expect(renderHook(() => useHardwareWalletsMetadata()).result.current.isLoading).toBe(false);
  });
});
