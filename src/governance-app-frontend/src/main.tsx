import '@common/styles/main.css';

import { ThemeProvider } from '@common/contexts/themeProvider';
import Homepage from '@pages/homepage/Homepage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import React from 'react';
import ReactDOM from 'react-dom/client';

const DFX_NETWORK = process.env.DFX_NETWORK;
const CANISTER_ID_INTERNET_IDENTITY = process.env.CANISTER_ID_INTERNET_IDENTITY;

const queryClient = new QueryClient();
const rootElement = document.getElementById('root') as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <InternetIdentityProvider
      loginOptions={{
        identityProvider:
          DFX_NETWORK === 'local'
            ? `http://${CANISTER_ID_INTERNET_IDENTITY}.localhost:8080`
            : 'https://identity.ic0.app',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Homepage />
        </ThemeProvider>
      </QueryClientProvider>
    </InternetIdentityProvider>
  </React.StrictMode>,
);
