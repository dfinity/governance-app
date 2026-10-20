import { isNullish, nonNullish } from '@dfinity/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { infoNotification } from '@utils/notification';
import { consumeLogoutRedirect } from '@common/auth/internetIdentity';

/**
 * Runs the route guards again when the account changes: on a login, a logout, an expired session,
 * or another tab that switches the account.
 */
export const useSessionChange = () => {
  const { identity, sessionEnd } = useInternetIdentity();
  const { invalidate } = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const principal = identity?.getPrincipal().toText();
  const previousPrincipal = useRef(principal);

  useEffect(() => {
    invalidate().finally(() => {
      // The route guards ran for this change, so later navigation gets the usual notice.
      consumeLogoutRedirect();

      const previous = previousPrincipal.current;
      previousPrincipal.current = principal;
      if (isNullish(previous) || previous === principal) return;

      // The cached data belongs to the account that left.
      queryClient.resetQueries();

      // Another tab switched to a different account.
      if (nonNullish(principal)) return;

      // A logout in any tab ends the session in all of them, so each tab reads it on its own.
      if (sessionEnd === 'logout') return;

      analytics.event(AnalyticsEvent.SessionExpired, undefined, { interactive: false });
      infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
    });
  }, [principal, sessionEnd, invalidate, queryClient, t]);
};
