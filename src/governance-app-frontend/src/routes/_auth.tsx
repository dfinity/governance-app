import { createFileRoute, Outlet } from '@tanstack/react-router';

import { BetaBanner } from '@components/BetaBanner';
import { MainLayout } from '@components/MainLayout';
import { analytics } from '@features/analytics/service';
import { useSessionCountdownToast } from '@hooks/useSessionCountdownToast';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { requireIdentity } from '@utils/router';
import { useEffect } from 'react';

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireIdentity,
  component: AuthLayout,
});

function AuthLayout() {
  useThemeShortcut();
  useSessionCountdownToast();

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
