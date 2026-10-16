import { useInternetIdentity } from 'ic-use-internet-identity';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { clearLedgerAgents } from '@common/canisters/agents';
import { clearLedgerIdentities } from '@common/ledger/session';

/**
 * @param source - Where the user starts the logout, for analytics.
 */
export const useLogout = (source: string) => {
  const { clear } = useInternetIdentity();

  return () => {
    analytics.event(AnalyticsEvent.SessionLogout, { source });
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    // The next user must connect their own device again.
    clearLedgerIdentities();
    clearLedgerAgents();
    clear();
  };
};
