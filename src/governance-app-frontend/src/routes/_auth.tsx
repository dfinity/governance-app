import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';

import { analytics } from '@features/analytics/service';

import { BetaBanner } from '@components/BetaBanner';
import { MainLayout } from '@components/MainLayout';
import { useIcpIndexTransactionsPolling } from '@hooks/icpIndex/useIcpIndexTransactionsPolling';
import { useScrollResetOnNavigation } from '@hooks/useScrollResetOnNavigation';
import { useSessionCountdownToast } from '@hooks/useSessionCountdownToast';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireIdentity,
  component: AuthLayout,
});

function AuthLayout() {
  useThemeShortcut();
  useSessionCountdownToast();
  useIcpIndexTransactionsPolling();
  useScrollResetOnNavigation();

  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <MainLayout>
      <BetaBanner isLoggedIn={true} />
      <Outlet />
    </MainLayout>
  );
}
