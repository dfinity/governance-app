import '@/app/styles/main.css';
import '@/i18n/config';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { InternetIdentityProvider } from 'ic-use-internet-identity';
import { StrictMode } from 'react';
import { createPortal } from 'react-dom';

import { Sonner } from '@components/Sonner';
import { IDENTITY_PROVIDER } from '@constants/extra';
import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { StakingRewardsProvider } from '@contexts/stakingRewardsProvider';
import { usePreventAttributeChange } from '@hooks/usePreventAttributeChange';
import { useTheme } from '@hooks/useTheme';
import { queryClientConfig, routerConfig } from '@utils/initializer';

export const App = () => {
  const notificationsContainer = document.getElementById('notifications');

  useTheme();
  usePreventAttributeChange({ selector: '#notifications', attribute: 'inert' });

  return (
    <StrictMode>
      <InternetIdentityProvider
        loginOptions={{
          identityProvider: IDENTITY_PROVIDER,
          // ...(nonNullish(II_DERIVATION_ORIGIN) && { derivationOrigin: II_DERIVATION_ORIGIN }),
        }}
      >
        <QueryClientProvider client={queryClientConfig}>
          <AgentPoolProvider>
            <StakingRewardsProvider>
              <RouterProvider router={routerConfig} />
              <ReactQueryDevtools initialIsOpen={false} />
              {notificationsContainer &&
                createPortal(
                  <Sonner position="top-center" visibleToasts={9} />,
                  notificationsContainer,
                )}
            </StakingRewardsProvider>
          </AgentPoolProvider>
        </QueryClientProvider>
      </InternetIdentityProvider>
    </StrictMode>
  );
};
