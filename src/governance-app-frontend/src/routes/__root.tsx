import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { Layout } from '@common/components/Layout';

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
      <TanStackRouterDevtools />
    </Layout>
  ),
});
