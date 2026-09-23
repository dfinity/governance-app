import { decodePayment } from '@icp-sdk/canisters/ledger/icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

const QR_CODE_FORMAT = 'qr_code';

// The only token that the send flow supports in a payment URI.
const PAYMENT_TOKEN = 'icp';

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

export type ScannedPayment = {
  address: string;
  amount?: number;
};

const isValidAddress = (value: string): boolean =>
  isValidIcpAddress(value) || isValidIcrcAddress(value);

/**
 * Returns the address and the optional amount from a scanned QR payload.
 * The payload is a plain address or a payment URI, `icp:<address>?amount=1.5`.
 * Returns `undefined` if the token is not `icp` or if the address is not a
 * valid ICP account identifier or ICRC-1 account.
 */
export const parseScannedPayment = (raw: string): ScannedPayment | undefined => {
  const value = raw.trim();
  if (isValidAddress(value)) return { address: value };

  // `decodePayment` does not validate the token or the address.
  const payment = decodePayment(value);
  if (isNullish(payment)) return undefined;
  if (payment.token.toLowerCase() !== PAYMENT_TOKEN) return undefined;
  if (!isValidAddress(payment.identifier)) return undefined;

  return {
    address: payment.identifier,
    ...(nonNullish(payment.amount) ? { amount: payment.amount } : {}),
  };
};
