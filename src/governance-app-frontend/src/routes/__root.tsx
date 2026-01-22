import { useQueryClient } from '@tanstack/react-query';
import { createRootRoute, Navigate, Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MainLayout } from '@components/MainLayout';
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

  const matches = useMatches();
  const isLoginPage = matches.some((m) => m.routeId === '/');

  // BE CAREFUL CHANGING THIS EFFECT!

  // Remember if we had an identity, to trigger a single change.
  const hadIdentity = useRef(!!identity);
  // Run on identity change: login, logout, but also auto-expiration.
  useEffect(() => {
    // Revalidate/re-check route guards in all cases.
    invalidate();

    // Logout or expiration change (single trigger).
    if (hadIdentity.current && !identity) {
      // Allow an async cycle for the authenticated agent to be removed before refreshing the queries.
      setTimeout(() => queryClient.resetQueries(), 0);

      // Check for manual logout flag.
      const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
      localStorage.removeItem(MANUAL_LOGOUT_KEY);

      // Show notification in case of expiration only.
      if (!isManualLogout) {
        infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
      }
    }

    // Remember last identity state.
    hadIdentity.current = !!identity;
  }, [identity, invalidate, queryClient, t]);

  // While initializing, we might want to show a loader or nothing to prevent flicker
  if (isInitializing) return null;

  if (isLoginPage) return <Outlet />;

  // @TODO: This could be removed but it guarantees a check in case a new route is added without a beforeLoad check
  if (!identity) return <Navigate to="/" />;

  return (
    <MainLayout>
      <Outlet />
      <TanStackRouterDevtools />
    </MainLayout>
  );
}
