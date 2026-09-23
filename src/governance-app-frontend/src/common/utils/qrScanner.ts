import { isNullish } from '@dfinity/utils';

import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

const QR_CODE_FORMAT = 'qr_code';

/**
 * Checks that the browser can scan QR codes from a camera stream.
 * Chrome ships `BarcodeDetector` on every platform but only Android, ChromeOS,
 * and macOS decode QR codes, so the format list is the real signal.
 */
export const isQrScannerSupported = async (): Promise<boolean> => {
  if (typeof BarcodeDetector === 'undefined') return false;
  if (isNullish(navigator.mediaDevices?.getUserMedia)) return false;

  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    return formats.includes(QR_CODE_FORMAT);
  } catch {
    return false;
  }
};

export const createQrDetector = (): BarcodeDetector =>
  new BarcodeDetector({ formats: [QR_CODE_FORMAT] });

/**
 * Returns the address from a scanned QR payload, or `undefined` if the payload
 * is not a valid ICP account identifier or ICRC-1 account.
 */
export const parseScannedAddress = (raw: string): string | undefined => {
  const value = raw.trim();
  if (isValidIcpAddress(value) || isValidIcrcAddress(value)) return value;
  return undefined;
};
