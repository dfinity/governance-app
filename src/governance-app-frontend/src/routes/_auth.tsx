import { createFileRoute, Outlet } from '@tanstack/react-router';

import { MainLayout } from '@components/MainLayout';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireIdentity,
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
