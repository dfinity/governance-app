import { isNullish } from '@dfinity/utils';

import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';

export type QrDecoder = (image: ImageData) => string | undefined;

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

/**
 * Returns the address from a scanned QR payload, or `undefined` if the payload
 * is not a valid ICP account identifier or ICRC-1 account.
 */
export const parseScannedAddress = (raw: string): string | undefined => {
  const value = raw.trim();
  if (isValidIcpAddress(value) || isValidIcrcAddress(value)) return value;
  return undefined;
};
