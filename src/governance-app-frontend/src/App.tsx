import '@common/styles/main.css';
import '@/i18n/config';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import { Toaster } from 'sonner';

import { CANISTER_ID_INTERNET_IDENTITY } from '@constants/canisterIds';
import { HOST, IS_LOCAL } from '@constants/extra';
import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { ThemeProvider } from '@contexts/themeProvider';
import { queryClientConfig, routerConfig } from '@utils/initializer';

const localIdentityProvider = `http://${CANISTER_ID_INTERNET_IDENTITY}.${HOST}`;
const mainnetIdentityProvider = 'https://identity.ic0.app';

export const App = () => (
  <StrictMode>
    <InternetIdentityProvider
      loginOptions={{
        identityProvider: IS_LOCAL ? localIdentityProvider : mainnetIdentityProvider,
        maxTimeToLive: BigInt(11_000_000_000),
      }}
    >
      <QueryClientProvider client={queryClientConfig}>
        <AgentPoolProvider>
          <ThemeProvider>
            <RouterProvider router={routerConfig} />
            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
          <Toaster richColors position="top-right" />
        </AgentPoolProvider>
      </QueryClientProvider>
    </InternetIdentityProvider>
  </StrictMode>
);
