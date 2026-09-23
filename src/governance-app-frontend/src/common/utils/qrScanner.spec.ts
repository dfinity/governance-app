import { afterEach, describe, expect, it, vi } from 'vitest';

import { isCameraSupported, loadQrDecoder, parseScannedPayment } from '@utils/qrScanner';
import {
  icpAccountIdQrFixture,
  icrcAddressQrFixture,
  type QrFixture,
  urlQrFixture,
} from '@fixtures/qrCodes';

const ICP_ADDRESS = icpAccountIdQrFixture.value;
const ICRC_ADDRESS = icrcAddressQrFixture.value;

const MODULE_PX = 4;
const QUIET_ZONE_MODULES = 4;

// Expands a module matrix into RGBA pixels, like a camera frame would hold.
const toImageData = ({ modules }: QrFixture): ImageData => {
  const size = (modules.length + 2 * QUIET_ZONE_MODULES) * MODULE_PX;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  modules.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '1') return;
      for (let dy = 0; dy < MODULE_PX; dy++) {
        for (let dx = 0; dx < MODULE_PX; dx++) {
          const px = (x + QUIET_ZONE_MODULES) * MODULE_PX + dx;
          const py = (y + QUIET_ZONE_MODULES) * MODULE_PX + dy;
          const offset = (py * size + px) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    });
  });
  return { data, width: size, height: size, colorSpace: 'srgb' } as ImageData;
};

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

describe('loadQrDecoder', () => {
  it('should decode an ICP account identifier from pixels', async () => {
    const decode = await loadQrDecoder();
    expect(decode(toImageData(icpAccountIdQrFixture))).toBe(icpAccountIdQrFixture.value);
  });

  it('should decode an ICRC-1 address from pixels', async () => {
    const decode = await loadQrDecoder();
    expect(decode(toImageData(icrcAddressQrFixture))).toBe(icrcAddressQrFixture.value);
  });

  it('should return the raw payload of a code that is not an address', async () => {
    const decode = await loadQrDecoder();
    expect(decode(toImageData(urlQrFixture))).toBe(urlQrFixture.value);
  });

  it('should return undefined for a frame without a code', async () => {
    const decode = await loadQrDecoder();
    const blank = { data: new Uint8ClampedArray(64 * 64 * 4).fill(255), width: 64, height: 64 };
    expect(decode(blank as ImageData)).toBeUndefined();
  });
});

describe('isCameraSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return true when getUserMedia exists', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    expect(isCameraSupported()).toBe(true);
  });

  it('should return false on an insecure origin without mediaDevices', () => {
    vi.stubGlobal('navigator', {});
    expect(isCameraSupported()).toBe(false);
  });
});
