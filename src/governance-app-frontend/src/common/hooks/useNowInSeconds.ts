import { useEffect, useState } from 'react';

import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { nowInSeconds } from '@utils/date';

/**
 * The current time in seconds. Re-renders the caller on each tick, so keep it in a small leaf
 * component.
 */
export const useNowInSeconds = (intervalMs: number = MILLISECONDS_IN_SECOND): number => {
  const [now, setNow] = useState(nowInSeconds);

  useEffect(() => {
    const interval = setInterval(() => setNow(nowInSeconds()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
};
