import '@common/styles/main.css';
import './i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { CANISTER_ID_INTERNET_IDENTITY } from '@common/constants/canisterIds';
import { HOST, IS_LOCAL } from '@common/constants/extra';
import { AgentPoolProvider } from '@common/contexts/agentPoolProvider';
import { ThemeProvider } from '@common/contexts/themeProvider';
import { routeTree } from '@/routeTree.gen';

const queryClient = new QueryClient();
const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const rootElement = document.getElementById('root') as HTMLElement;

const localIdentityProvider = `http://${CANISTER_ID_INTERNET_IDENTITY}.${HOST}`;
const mainnetIdentityProvider = 'https://identity.ic0.app';

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <InternetIdentityProvider
      loginOptions={{
        identityProvider: IS_LOCAL ? localIdentityProvider : mainnetIdentityProvider,
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
