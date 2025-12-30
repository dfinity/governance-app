import '@/app/styles/main.css';
import '@/i18n/config';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import { createPortal } from 'react-dom';

import { Sonner } from '@components/Sonner';
import { CANISTER_ID_INTERNET_IDENTITY } from '@constants/canisterIds';
import { HOST, IS_LOCAL } from '@constants/extra';
import { usePreventAttributeChange } from '@hooks/usePreventAttributeChange';
import { queryClientConfig, routerConfig } from '@utils/initializer';

import { AgentPoolProvider } from '@/app/contexts/agentPoolProvider';
import { ThemeProvider } from '@/app/contexts/themeProvider';

const localIdentityProvider = `http://${CANISTER_ID_INTERNET_IDENTITY}.${HOST}`;
const mainnetIdentityProvider = 'https://id.ai';

export const App = () => {
  const notificationsContainer = document.getElementById('notifications');
  usePreventAttributeChange({ selector: '#notifications', attribute: 'inert' });

  return (
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
              <ReactQueryDevtools initialIsOpen={false} />
              {notificationsContainer &&
                createPortal(<Sonner position="top-center" />, notificationsContainer)}
            </ThemeProvider>
          </AgentPoolProvider>
        </QueryClientProvider>
      </InternetIdentityProvider>
    </StrictMode>
  );
};
