import { useEffect, useRef } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

/**
 * Starts the tracker on the login page and sends the result of each login attempt.
 * The auth module does not keep the login error, so `login_error` also counts a closed popup.
 */
export const useLoginAnalytics = () => {
  const { identity, isLoggingIn } = useInternetIdentity();
  const wasLoggingIn = useRef(isLoggingIn);

  useEffect(() => {
    analytics.init();
  }, []);

  useEffect(() => {
    if (wasLoggingIn.current && !isLoggingIn) {
      analytics.event(identity ? AnalyticsEvent.LoginSuccess : AnalyticsEvent.LoginError);
    }
    wasLoggingIn.current = isLoggingIn;
  }, [isLoggingIn, identity]);
};
