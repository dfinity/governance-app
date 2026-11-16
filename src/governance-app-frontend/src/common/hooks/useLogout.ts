import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { clearLedgerAgents } from '@common/canisters/agents';
import { clearLedgerIdentities } from '@common/ledger/session';

/**
 * @param source - Where the user starts the logout, for analytics.
 */
export const useLogout = (source: string) => {
  const { logout } = useInternetIdentity();

  return () => {
    analytics.event(AnalyticsEvent.SessionLogout, { source });
    // The next user must connect their own device again.
    clearLedgerIdentities();
    clearLedgerAgents();
    logout();
  };
};
