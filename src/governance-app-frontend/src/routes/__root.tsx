import { useQueryClient } from '@tanstack/react-query';
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { infoNotification } from '@utils/notification';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { identity, isInitializing } = useInternetIdentity();
  const { invalidate } = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const hadIdentity = useRef(!!identity);

  // Global identity change handler: login, logout, and auto-expiration
  useEffect(() => {
    // Revalidate/re-check route guards on any identity change
    invalidate();

    // Handle logout or session expiration
    if (hadIdentity.current && !identity) {
      // Reset queries after identity is removed
      setTimeout(() => queryClient.resetQueries(), 0);

      // Check if this was a manual logout or auto-expiration
      const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
      localStorage.removeItem(MANUAL_LOGOUT_KEY);

      // Notify user only on auto-expiration
      if (!isManualLogout) {
        infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
      }
    }

    hadIdentity.current = !!identity;
  }, [identity, invalidate, queryClient, t]);

  // Prevent flicker during initialization
  if (isInitializing) return null;

  return <Outlet />;
}
