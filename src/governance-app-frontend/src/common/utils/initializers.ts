import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof routerConfig;
  }
}

export const queryClientConfig = new QueryClient();

export const routerConfig = createRouter({
  routeTree,
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
});
