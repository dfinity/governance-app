import { useInternetIdentity } from 'ic-use-internet-identity';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

/**
 * @param source - Where the user starts the logout, for analytics.
 */
export const useLogout = (source: string) => {
  const { clear } = useInternetIdentity();

  return () => {
    analytics.event(AnalyticsEvent.SessionLogout, { source });
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  };
};
