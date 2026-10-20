import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

/**
 * @param source - Where the user starts the logout, for analytics.
 */
export const useLogout = (source: string) => {
  const { logout } = useInternetIdentity();

  return () => {
    analytics.event(AnalyticsEvent.SessionLogout, { source });
    logout();
  };
};
