import { decodePayment } from '@icp-sdk/canisters/ledger/icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

export type QrDecoder = (image: ImageData) => string | undefined;

// The only token that the send flow supports in a payment URI.
const PAYMENT_TOKEN = 'icp';

/**
 * Checks that the browser exposes the camera API.
 * Browsers remove `mediaDevices` on insecure origins.
 */
export const isCameraSupported = (): boolean =>
  !isNullish(globalThis.navigator?.mediaDevices?.getUserMedia);

/**
 * Loads the QR decoder on demand, so users who never scan do not download it.
 * The native `BarcodeDetector` API is not an option: Safari ships it behind a
 * flag and it is broken on iOS 18+, and Firefox does not implement it.
 */
export const loadQrDecoder = async (): Promise<QrDecoder> => {
  const { default: jsQR } = await import('jsqr');
  return (image) =>
    jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data;
};

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
