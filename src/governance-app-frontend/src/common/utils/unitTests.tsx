import { QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import { AgentPoolProvider } from '@contexts/agentPoolProvider';
import { ThemeProvider } from '@contexts/themeProvider';
import { queryClientConfig } from '@utils/initializers';

// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClientConfig}>
      <AgentPoolProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AgentPoolProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });
