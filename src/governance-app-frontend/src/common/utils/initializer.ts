import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    title?: string;
  }

  interface Register {
    router: typeof routerConfig;
  }
}

export const queryClientConfig = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 Minutes before revalidating.
    },
  },
});

export const routerConfig = createRouter({
  routeTree,
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
  scrollRestoration: true,
  scrollToTopSelectors: ['main'],
});
