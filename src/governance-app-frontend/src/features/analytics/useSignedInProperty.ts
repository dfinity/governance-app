import { nonNullish } from '@dfinity/utils';
import { useEffect } from 'react';

import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

/**
 * Keeps the `signed_in` property of every event in sync with the session, so signed-out readers
 * can be told apart. Call it before the hook that starts the tracker, so the first pageview has it.
 */
export const useSignedInProperty = () => {
  const { identity } = useInternetIdentity();
  const signedIn = nonNullish(identity) ? 'yes' : 'no';

  useEffect(() => {
    analytics.setProperties({ signed_in: signedIn });
  }, [signedIn]);
};
