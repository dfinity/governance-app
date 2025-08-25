import '@common/styles/main.css';
import '@/i18n/config';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { CANISTER_ID_INTERNET_IDENTITY } from '@constants/canisterIds';
import { IS_LOCAL } from '@constants/extra';
import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { ThemeProvider } from '@contexts/themeProvider';
import { queryClientConfig, routerConfig } from '@utils/initializers';

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
      <QueryClientProvider client={queryClientConfig}>
        <AgentPoolProvider>
          <ThemeProvider>
            <RouterProvider router={routerConfig} />
          </ThemeProvider>
        </AgentPoolProvider>
      </QueryClientProvider>
    </InternetIdentityProvider>
  </StrictMode>,
);
