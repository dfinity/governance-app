import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '@features/accounts/types';

import { mockNeuron } from '@fixtures/neuron';

import { useLedgerSignerPrincipals, useNeuronSigner } from './useNeuronSigner';

const II_PRINCIPAL = 'ii-principal';
const DEVICE_PRINCIPAL = 'device-principal';

const mocks = vi.hoisted(() => ({
  devices: vi.fn(() => [] as unknown[]),
  webHid: vi.fn(() => true),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => II_PRINCIPAL }) },
  }),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: () => ({ data: mocks.devices(), isLoading: false }),
}));

vi.mock('@common/ledger/webhid', () => ({
  isWebHidSupported: () => mocks.webHid(),
}));

const device = {
  name: 'Nano X',
  accountId: 'device-account',
  type: AccountType.HardwareWallet,
  principal: DEVICE_PRINCIPAL,
};

describe('useLedgerSignerPrincipals', () => {
  beforeEach(() => {
    mocks.devices.mockReturnValue([device]);
    mocks.webHid.mockReturnValue(true);
  });

  it('returns the principals of the registered devices', () => {
    const { result } = renderHook(() => useLedgerSignerPrincipals());

    expect(result.current).toEqual([DEVICE_PRINCIPAL]);
  });

  it('returns nothing when the browser has no WebHID', () => {
    mocks.webHid.mockReturnValue(false);

    const { result } = renderHook(() => useLedgerSignerPrincipals());

    expect(result.current).toEqual([]);
  });

  it('skips a device without a principal', () => {
    mocks.devices.mockReturnValue([{ ...device, principal: undefined }]);

    const { result } = renderHook(() => useLedgerSignerPrincipals());

    expect(result.current).toEqual([]);
  });
});

describe('useNeuronSigner', () => {
  beforeEach(() => {
    mocks.devices.mockReturnValue([device]);
    mocks.webHid.mockReturnValue(true);
  });

  it('returns the Internet Identity signer when the session controls the neuron', () => {
    const neuron = mockNeuron({ fullNeuron: { controller: II_PRINCIPAL } });

    const { result } = renderHook(() => useNeuronSigner(neuron));

    expect(result.current).toEqual({ kind: 'ii' });
  });

  it('returns the Ledger signer when a registered device controls the neuron', () => {
    const neuron = mockNeuron({
      fullNeuron: { controller: DEVICE_PRINCIPAL, hotKeys: [II_PRINCIPAL] },
    });

    const { result } = renderHook(() => useNeuronSigner(neuron));

    expect(result.current).toEqual({ kind: 'ledger', principal: DEVICE_PRINCIPAL });
  });

  it('returns no signer for a device neuron when the browser has no WebHID', () => {
    mocks.webHid.mockReturnValue(false);
    const neuron = mockNeuron({
      fullNeuron: { controller: DEVICE_PRINCIPAL, hotKeys: [II_PRINCIPAL] },
    });

    const { result } = renderHook(() => useNeuronSigner(neuron));

    expect(result.current).toBeUndefined();
  });

  it('returns no signer for a device that is not registered', () => {
    mocks.devices.mockReturnValue([]);
    const neuron = mockNeuron({
      fullNeuron: { controller: DEVICE_PRINCIPAL, hotKeys: [II_PRINCIPAL] },
    });

    const { result } = renderHook(() => useNeuronSigner(neuron));

    expect(result.current).toBeUndefined();
  });

  it('returns no signer for a hotkey-only neuron', () => {
    const neuron = mockNeuron({ fullNeuron: { controller: 'other', hotKeys: [II_PRINCIPAL] } });

    const { result } = renderHook(() => useNeuronSigner(neuron));

    expect(result.current).toBeUndefined();
  });

  it('returns no signer without a neuron', () => {
    const { result } = renderHook(() => useNeuronSigner(null));

    expect(result.current).toBeUndefined();
  });
});
