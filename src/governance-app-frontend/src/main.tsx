import '@common/styles/main.css';
import '@i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { Layout } from '@common/components/layout';
import { CANISTER_ID_INTERNET_IDENTITY } from '@common/constants/canisterIds';
import { IS_LOCAL } from '@common/constants/extra';
import { AgentPoolProvider } from '@common/contexts/agentPoolProvider';
import { ThemeProvider } from '@common/contexts/themeProvider';
import Homepage from '@pages/homepage/Homepage';

const queryClient = new QueryClient();
const rootElement = document.getElementById('root') as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
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
            <Layout>
              <Homepage />
            </Layout>
          </ThemeProvider>
        </AgentPoolProvider>
      </QueryClientProvider>
    </InternetIdentityProvider>
  </React.StrictMode>,
);
