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

// Disable retries in E2E tests to speed up failure scenarios.
const isE2E = typeof window !== 'undefined' && window.isPlaywright;

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
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
});
