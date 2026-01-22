import { useQueryClient } from '@tanstack/react-query';
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { infoNotification } from '@utils/notification';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { identity } = useInternetIdentity();
  const { invalidate } = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const hadIdentity = useRef(!!identity);

  // Global identity change handler: login, logout, and auto-expiration
  useEffect(() => {
    // Revalidate/re-check route guards on any identity change
    invalidate().finally(() => {
      if (!hadIdentity.current || identity) return;

      // Handle logout or session expiration

      // Reset queries after identity is removed
      queryClient.resetQueries();

      // Check if this was a manual logout or auto-expiration
      const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
      localStorage.removeItem(MANUAL_LOGOUT_KEY);

      if (isManualLogout) return;

      // Notify user only on auto-expiration
      infoNotification({ description: t(($) => $.common.autoExpirationLogout) });

      hadIdentity.current = !!identity;
    });
  }, [identity, invalidate, queryClient, t]);

  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}
