import { createRootRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { MainLayout } from '@components/MainLayout';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { identity, isInitializing } = useInternetIdentity();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // While initializing, we might want to show a loader or nothing to prevent flicker
  if (isInitializing) return null;

  // Redirect to login if not authenticated and not on login page
  if (!identity && !isLoginPage) return <Navigate to="/login" />;

  // If on login page, render without MainLayout
  if (isLoginPage) {
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    );
  }

  return (
    <MainLayout>
      <Outlet />
      <TanStackRouterDevtools />
    </MainLayout>
  );
}
