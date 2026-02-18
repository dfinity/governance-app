import { QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { useTheme } from '@hooks/useTheme';
import { queryClientConfig } from '@utils/initializer';

// eslint-disable-next-line react-refresh/only-export-components -- Test utility, not part of dev server HMR
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  useTheme();
  return (
    <QueryClientProvider client={queryClientConfig}>
      <AgentPoolProvider>{children}</AgentPoolProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });
