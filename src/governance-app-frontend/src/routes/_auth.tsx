import { isNullish } from '@dfinity/utils';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect } from 'react';

import { analytics } from '@features/analytics/service';

import { MainLayout } from '@components/MainLayout';
import { useIcpIndexTransactionsPolling } from '@hooks/icpIndex/useIcpIndexTransactionsPolling';
import { useLogoutShortcut } from '@hooks/useLogoutShortcut';
import { useNewFeatureCheck } from '@hooks/useNewFeatureCheck';
import { useScrollResetOnNavigation } from '@hooks/useScrollResetOnNavigation';
import { useSessionCountdownToast } from '@hooks/useSessionCountdownToast';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireIdentity,
  component: AuthLayout,
  head: () => {
    return {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  },
});

function AuthLayout() {
  const { identity } = useInternetIdentity();

  useThemeShortcut();
  useLogoutShortcut();
  useSessionCountdownToast();
  useIcpIndexTransactionsPolling();
  useScrollResetOnNavigation();
  useNewFeatureCheck();

  useEffect(() => {
    analytics.init();
  }, []);

  // Guard against the brief re-render window between identity clearing (synchronous)
  // and route invalidation (async). Without this, child components could crash
  // accessing identity-derived data (e.g. accountId) before the router redirects.
  if (isNullish(identity)) return null;

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
