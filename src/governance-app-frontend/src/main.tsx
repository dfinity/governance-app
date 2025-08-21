import '@common/styles/main.css';

import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';

import { IS_LOCAL } from '@common/constants/extra';
import { CANISTER_ID_INTERNET_IDENTITY } from '@common/constants/canisterIds';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
import { AgentPoolProvider } from '@common/contexts/agentPoolProvider';
import { StrictMode } from 'react';
import { ThemeProvider } from '@common/contexts/themeProvider';

const queryClient = new QueryClient();
const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <InternetIdentityProvider
      loginOptions={{
        identityProvider: IS_LOCAL
          ? `http://${CANISTER_ID_INTERNET_IDENTITY}.localhost:8080`
          : 'https://identity.ic0.app',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AgentPoolProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
          </ThemeProvider>
        </AgentPoolProvider>
      </QueryClientProvider>
    </InternetIdentityProvider>
  </StrictMode>,
);
