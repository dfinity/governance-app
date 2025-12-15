import { useQueryClient } from '@tanstack/react-query';
import { createRootRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MainLayout } from '@components/MainLayout';
import { infoNotification } from '@utils/notification';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { identity, isInitializing } = useInternetIdentity();
  const location = useLocation();
  const { invalidate } = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isLoginPage = location.pathname === '/login';

  // BE CAREFUL CHANGING THIS EFFECT!

  // Track manual logout, to distinguish from expiration, and show a notification.
  const wasManualLogout = useRef(false);
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

      // Show notification in case of expiration only.
      if (!wasManualLogout.current) {
        infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
      }
    }

    // Reset manual logout tracking.
    wasManualLogout.current = false;
    // Remember last identity state.
    hadIdentity.current = !!identity;
  }, [identity, invalidate, queryClient, t]);

  // While initializing, we might want to show a loader or nothing to prevent flicker
  if (isInitializing) return null;

  if (isLoginPage)
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    );

  if (!identity) return <Navigate to="/login" />;

  return (
    <MainLayout>
      <Outlet />
      <TanStackRouterDevtools />
    </MainLayout>
  );
}
