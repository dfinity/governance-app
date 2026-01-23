import { createFileRoute, Outlet } from '@tanstack/react-router';

import { BetaBanner } from '@components/BetaBanner';
import { MainLayout } from '@components/MainLayout';
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

  return (
    <MainLayout>
      <BetaBanner isLoggedIn={true} />
      <Outlet />
    </MainLayout>
  );
}
