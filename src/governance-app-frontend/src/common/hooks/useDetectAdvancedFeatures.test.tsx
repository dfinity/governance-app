import { Principal } from '@icp-sdk/core/principal';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdvancedFeature } from '@typings/advancedFeatures';

import { useDetectAdvancedFeatures } from './useDetectAdvancedFeatures';

const mocks = vi.hoisted(() => ({
  nnsDappAccount: vi.fn(),
  governanceNeurons: vi.fn(),
  advancedFeatures: vi.fn(),
  isWebHidSupported: vi.fn(),
}));

vi.mock('@hooks/nnsDapp/useNnsDappAccount', () => ({ useNnsDappAccount: mocks.nnsDappAccount }));
vi.mock('@hooks/governance', () => ({ useGovernanceNeurons: mocks.governanceNeurons }));
vi.mock('@hooks/useAdvancedFeatures', () => ({ useAdvancedFeatures: mocks.advancedFeatures }));
vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: mocks.isWebHidSupported }));

const DEVICE = {
  name: 'Nano X',
  principal: Principal.fromText('aaaaa-aa'),
  account_identifier: 'device-id',
};

const mockAccount = (hardwareWallets: (typeof DEVICE)[]) =>
  mocks.nnsDappAccount.mockReturnValue({
    data: { response: { sub_accounts: [], hardware_wallet_accounts: hardwareWallets } },
    isLoading: false,
  });

describe('useDetectAdvancedFeatures', () => {
  beforeEach(() => {
    mocks.advancedFeatures.mockReturnValue({
      missingFeatureKeys: [AdvancedFeature.LedgerDevice],
    });
    mocks.governanceNeurons.mockReturnValue({ data: undefined, isLoading: false });
    mocks.isWebHidSupported.mockReturnValue(true);
  });

  it('detects a registered Ledger device when WebHID is available', () => {
    mockAccount([DEVICE]);

    const { result } = renderHook(() => useDetectAdvancedFeatures());

    expect(result.current.detectedFeatures).toEqual({ [AdvancedFeature.LedgerDevice]: true });
    expect(mocks.nnsDappAccount).toHaveBeenCalledWith(true);
  });

  it('reports no device when none is registered', () => {
    mockAccount([]);

    const { result } = renderHook(() => useDetectAdvancedFeatures());

    expect(result.current.detectedFeatures).toEqual({ [AdvancedFeature.LedgerDevice]: false });
  });

  it('skips the check and the fetch without WebHID', () => {
    mocks.isWebHidSupported.mockReturnValue(false);
    mockAccount([DEVICE]);

    const { result } = renderHook(() => useDetectAdvancedFeatures());

    expect(result.current.detectedFeatures).toEqual({});
    expect(result.current.isDetecting).toBe(false);
    expect(mocks.nnsDappAccount).toHaveBeenCalledWith(false);
  });
});
