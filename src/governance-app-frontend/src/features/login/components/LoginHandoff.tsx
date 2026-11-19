import { nonNullish } from '@dfinity/utils';
import { useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppFrame } from '@components/MainLayout';
import { DashboardSkeleton } from '@components/skeletons/DashboardSkeleton';
import { SkeletonScreen } from '@components/skeletons/SkeletonScreen';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { isAccountsAreaEnabled } from '@utils/advancedFeatures';
import { isSafeInternalRedirect } from '@utils/router';
import { setLoginHandoffActive } from '@common/auth/loginHandoff';

const DASHBOARD_PATH = '/dashboard';

/**
 * Covers the page from the answer of Internet Identity until the first route is ready, so a login
 * shows one loading frame. It renders at the root because the route changes under it.
 */
export const LoginHandoff = () => {
  const { identity, isFinishingLogin } = useInternetIdentity();
  const { features } = useAdvancedFeatures();
  const pathname = useRouterState({ select: ({ location }) => location.pathname });
  // The raw query value, which the login route validates for itself.
  const redirect = useRouterState({
    select: ({ location }) => (location.search as { redirect?: unknown }).redirect,
  });
  const isRouteLoading = useRouterState({ select: ({ status }) => status === 'pending' });

  const [isActive, setIsActive] = useState(false);

  const isLoginFailed = !isFinishingLogin && !nonNullish(identity);
  const isRouteReady = pathname !== '/' && !isRouteLoading;

  if (!isActive && isFinishingLogin && !isRouteReady) setIsActive(true);
  if (isActive && (isLoginFailed || isRouteReady)) setIsActive(false);

  // The page under the frame keeps its controls, so the keyboard must not reach them.
  // Dialogs and shortcuts of that page wait for the frame too.
  useEffect(() => {
    if (!isActive) return;

    const root = document.getElementById('root');
    if (root) root.inert = true;
    setLoginHandoffActive(true);
    return () => {
      if (root) root.inert = false;
      setLoginHandoffActive(false);
    };
  }, [isActive]);

  if (!isActive) return null;

  const loginTarget = isSafeInternalRedirect(redirect) ? redirect : DASHBOARD_PATH;
  const target = pathname === '/' ? loginTarget : pathname;

  // Outside `#root`, which is inert while the frame covers it.
  return createPortal(
    // `inert` stays off the backdrop: an inert element lets clicks through to the page below.
    <div className="fixed inset-0 z-60 bg-background" data-testid="login-handoff">
      {/* The frame is inert, so screen readers hear the loading from here. */}
      <SkeletonScreen className="sr-only" data-testid="login-handoff-status" />
      <AppFrame inert activeHref={target}>
        {target.startsWith(DASHBOARD_PATH) && (
          <DashboardSkeleton subaccounts={isAccountsAreaEnabled(features)} />
        )}
      </AppFrame>
    </div>,
    document.body,
  );
};
