import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import { AgentPoolProvider } from '@common/contexts/agentPoolProvider';
import { ThemeProvider } from '@common/contexts/themeProvider';

const queryClient = new QueryClient();
// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AgentPoolProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AgentPoolProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });
