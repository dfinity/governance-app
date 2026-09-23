import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isQrScannerSupported, parseScannedAddress } from '@utils/qrScanner';

const ICRC_ADDRESS = 'aaaaa-aa';
const ICP_ADDRESS = AccountIdentifier.fromPrincipal({
  principal: Principal.fromText(ICRC_ADDRESS),
}).toHex();

describe('parseScannedAddress', () => {
  it('should return an ICP account identifier', () => {
    expect(parseScannedAddress(ICP_ADDRESS)).toBe(ICP_ADDRESS);
  });

  it('should return an ICRC-1 address', () => {
    expect(parseScannedAddress(ICRC_ADDRESS)).toBe(ICRC_ADDRESS);
  });

  it('should trim whitespace around the address', () => {
    expect(parseScannedAddress(`  ${ICP_ADDRESS}\n`)).toBe(ICP_ADDRESS);
  });

  it('should return undefined for a payload that is not an address', () => {
    expect(parseScannedAddress('https://example.com')).toBeUndefined();
    expect(parseScannedAddress('')).toBeUndefined();
  });
});

describe('isQrScannerSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubMediaDevices = () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
  };

  it('should return false when BarcodeDetector is missing', async () => {
    stubMediaDevices();
    vi.stubGlobal('BarcodeDetector', undefined);
    await expect(isQrScannerSupported()).resolves.toBe(false);
  });

  it('should return false when the camera API is missing', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('BarcodeDetector', { getSupportedFormats: async () => ['qr_code'] });
    await expect(isQrScannerSupported()).resolves.toBe(false);
  });

  it('should return false when the browser cannot decode QR codes', async () => {
    stubMediaDevices();
    vi.stubGlobal('BarcodeDetector', { getSupportedFormats: async () => [] });
    await expect(isQrScannerSupported()).resolves.toBe(false);
  });

  it('should return false when the format query throws', async () => {
    stubMediaDevices();
    vi.stubGlobal('BarcodeDetector', {
      getSupportedFormats: async () => {
        throw new Error('boom');
      },
    });
    await expect(isQrScannerSupported()).resolves.toBe(false);
  });

  it('should return true when QR codes are supported', async () => {
    stubMediaDevices();
    vi.stubGlobal('BarcodeDetector', { getSupportedFormats: async () => ['qr_code'] });
    await expect(isQrScannerSupported()).resolves.toBe(true);
  });
});
