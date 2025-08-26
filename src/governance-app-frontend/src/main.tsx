import '@common/styles/main.css';
import '@/i18n/config';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { CANISTER_ID_INTERNET_IDENTITY } from '@constants/canisterIds';
import { HOST, IS_LOCAL } from '@constants/extra';
import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { ThemeProvider } from '@contexts/themeProvider';
import { queryClientConfig, routerConfig } from '@utils/initializers';

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
