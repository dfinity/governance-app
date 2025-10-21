import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import { ThemeProvider } from '@contexts/themeProvider';
import { queryClientConfig } from '@utils/initializer';

// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClientConfig}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export const changeInputValue = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } });
