import { useEffect, useState } from 'react';

const PWA_BOOT_DELAY_MS = 500;

export function isPwa(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * When running as a PWA, the viewport can report wrong dimensions during the
 * launch animation. This hook keeps the app from rendering the real layout
 * until after a short delay so dimensions have settled.
 * Returns { isPwa, isReady }. When not PWA, isReady is true immediately.
 */
export function usePwaBootReady(): { isPwa: boolean; isReady: boolean } {
  const [isReady, setReady] = useState(() => !isPwa());
  const pwa = isPwa();

  useEffect(() => {
    if (!isPwa()) return;

    const t = window.setTimeout(() => setReady(true), PWA_BOOT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return { isPwa: pwa, isReady };
}
