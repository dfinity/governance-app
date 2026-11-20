import { useEffect, useRef } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

/** The control that started a login. */
export type LoginSource = 'login_page' | 'reader_sidebar' | 'reader_top_bar' | 'reader_vote_row';

let loginSource: LoginSource = 'login_page';

/** Sets the `source` property of the next `login_success` or `login_error`. */
export const setLoginSource = (source: LoginSource) => {
  loginSource = source;
};

/**
 * Starts the tracker and sends the result of each login attempt, with the control that started it.
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
      analytics.event(identity ? AnalyticsEvent.LoginSuccess : AnalyticsEvent.LoginError, {
        source: loginSource,
      });
      loginSource = 'login_page';
    }
    wasLoggingIn.current = isLoggingIn;
  }, [isLoggingIn, identity]);
};
