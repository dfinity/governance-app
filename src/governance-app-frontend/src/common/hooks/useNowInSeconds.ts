import { useEffect, useState } from 'react';

import { MILLISECONDS_IN_SECOND } from '@constants/extra';

// Floored, so a countdown never reaches zero before its end timestamp.
const flooredNowInSeconds = (): number => Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

/**
 * The current time in seconds. Re-renders the caller on each tick, so keep it in a small leaf
 * component.
 */
export const useNowInSeconds = (intervalMs: number = MILLISECONDS_IN_SECOND): number => {
  const [now, setNow] = useState(flooredNowInSeconds);

  useEffect(() => {
    const interval = setInterval(() => setNow(flooredNowInSeconds()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
};
