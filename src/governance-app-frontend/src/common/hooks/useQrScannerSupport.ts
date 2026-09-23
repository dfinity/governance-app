import { useEffect, useState } from 'react';

import { isQrScannerSupported } from '@utils/qrScanner';

// Browser support does not change during a session, so resolve it once.
let supportPromise: Promise<boolean> | undefined;

export function useQrScannerSupport(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let active = true;
    supportPromise ??= isQrScannerSupported();
    supportPromise.then((value) => {
      if (active) setSupported(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return supported;
}
