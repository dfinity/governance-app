import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { useInternetIdentity } from '@hooks/useInternetIdentity';

/**
 * @param source - Where the user starts the logout, for analytics.
 */
export const useLogout = (source: string) => {
  const { logout } = useInternetIdentity();

  return () => {
    analytics.event(AnalyticsEvent.SessionLogout, { source });
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    logout();
  };
};
