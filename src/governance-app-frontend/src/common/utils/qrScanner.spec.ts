import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isQrScannerSupported, parseScannedPayment } from '@utils/qrScanner';

const ICRC_ADDRESS = 'aaaaa-aa';
const ICP_ADDRESS = AccountIdentifier.fromPrincipal({
  principal: Principal.fromText(ICRC_ADDRESS),
}).toHex();

describe('parseScannedPayment', () => {
  it('should return an ICP account identifier', () => {
    expect(parseScannedPayment(ICP_ADDRESS)).toEqual({ address: ICP_ADDRESS });
  });

  it('should return an ICRC-1 address', () => {
    expect(parseScannedPayment(ICRC_ADDRESS)).toEqual({ address: ICRC_ADDRESS });
  });

  it('should trim whitespace around the address', () => {
    expect(parseScannedPayment(`  ${ICP_ADDRESS}\n`)).toEqual({ address: ICP_ADDRESS });
  });

  it('should return the address and the amount from a payment URI', () => {
    expect(parseScannedPayment(`icp:${ICP_ADDRESS}?amount=1.5`)).toEqual({
      address: ICP_ADDRESS,
      amount: 1.5,
    });
    expect(parseScannedPayment(`icp:${ICRC_ADDRESS}?amount=0.25`)).toEqual({
      address: ICRC_ADDRESS,
      amount: 0.25,
    });
  });

  it('should return only the address from a payment URI without an amount', () => {
    expect(parseScannedPayment(`icp:${ICP_ADDRESS}`)).toEqual({ address: ICP_ADDRESS });
  });

  it('should ignore an amount that is not a number', () => {
    expect(parseScannedPayment(`icp:${ICP_ADDRESS}?amount=abc`)).toEqual({
      address: ICP_ADDRESS,
    });
  });

  it('should accept the token in any case', () => {
    expect(parseScannedPayment(`ICP:${ICP_ADDRESS}?amount=2`)).toEqual({
      address: ICP_ADDRESS,
      amount: 2,
    });
  });

  it('should return undefined for a payment URI with another token', () => {
    expect(parseScannedPayment(`ckbtc:${ICRC_ADDRESS}?amount=1`)).toBeUndefined();
  });

  it('should return undefined for a payment URI with an invalid address', () => {
    expect(parseScannedPayment('icp:not-an-address?amount=1')).toBeUndefined();
  });

  it('should return undefined for a payload that is not an address', () => {
    expect(parseScannedPayment('https://example.com')).toBeUndefined();
    expect(parseScannedPayment('')).toBeUndefined();
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
