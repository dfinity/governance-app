import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

import { isE2E } from './e2e';

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
      retry: isE2E ? false : undefined,
    },
    mutations: {
      retry: isE2E ? false : undefined,
    },
  },
});

export const routerConfig = createRouter({
  routeTree,
  // Exposed to route loaders so they can warm the cache while the route's own
  // chunk is still downloading, instead of waiting for the component to mount.
  context: { queryClient: queryClientConfig },
  defaultPreload: 'intent',
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
});
