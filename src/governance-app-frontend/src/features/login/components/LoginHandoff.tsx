import { nonNullish } from '@dfinity/utils';
import { useRouterState } from '@tanstack/react-router';
import { useState } from 'react';

import { AppFrame } from '@components/MainLayout';
import { DashboardSkeleton } from '@components/skeletons/DashboardSkeleton';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { isAccountsAreaEnabled } from '@utils/advancedFeatures';

const DASHBOARD_PATH = '/dashboard';

/**
 * Covers the page from the answer of Internet Identity until the first route is ready, so a login
 * shows one loading frame. It renders at the root because the route changes under it.
 */
export const LoginHandoff = () => {
  const { identity, isFinishingLogin } = useInternetIdentity();
  const { features } = useAdvancedFeatures();
  const pathname = useRouterState({ select: ({ location }) => location.pathname });
  const redirect = useRouterState({
    select: ({ location }) => (location.search as { redirect?: string }).redirect,
  });
  const isRouteLoading = useRouterState({ select: ({ status }) => status === 'pending' });

  const [isActive, setIsActive] = useState(false);

  const isLoginFailed = !isFinishingLogin && !nonNullish(identity);
  const isRouteReady = pathname !== '/' && !isRouteLoading;

  if (!isActive && isFinishingLogin) setIsActive(true);
  if (isActive && (isLoginFailed || isRouteReady)) setIsActive(false);

  if (!isActive) return null;

  const target = pathname === '/' ? (redirect ?? DASHBOARD_PATH) : pathname;

  return (
    <div inert className="fixed inset-0 z-60 bg-background" data-testid="login-handoff">
      <AppFrame activeHref={target}>
        {target.startsWith(DASHBOARD_PATH) && (
          <DashboardSkeleton subaccounts={isAccountsAreaEnabled(features)} />
        )}
      </AppFrame>
    </div>
  );
};
