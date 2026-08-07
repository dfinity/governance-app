import { useEffect, useState } from 'react';

import { LOADING_INDICATOR_DELAY } from '@constants/extra';

/**
 * Returns `true` only once `active` has stayed true for `delayMs`.
 *
 * Used to hold back loading indicators. Queries resolve at whatever speed the
 * network allows — a warm IC query call comes back in well under 100ms — and
 * painting a skeleton for a handful of frames on the way to content reads as a
 * flicker. Delaying the *indicator* keeps that away without delaying the data.
 */
export const useDelayedFlag = (active: boolean, delayMs: number = LOADING_INDICATOR_DELAY) => {
  const [elapsed, setElapsed] = useState(false);
  const [previousActive, setPreviousActive] = useState(active);

  // Rearm on any change of `active`, so the next active spell waits the delay
  // out again. Adjusting during render rather than in an effect: React reruns
  // this component before committing, so no extra frame is shown.
  if (previousActive !== active) {
    setPreviousActive(active);
    setElapsed(false);
  }

  useEffect(() => {
    if (!active) return;

    const timeout = window.setTimeout(() => setElapsed(true), delayMs);

    return () => window.clearTimeout(timeout);
  }, [active, delayMs]);

  return active && elapsed;
};
