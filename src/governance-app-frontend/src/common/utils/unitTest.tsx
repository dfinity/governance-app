import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, RenderOptions, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import { expect } from 'vitest';

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

/** Radix listens for pointer events outside an open dialog one task after it blocks the page. */
export const waitForOutsideListeners = async () => {
  await waitFor(() => expect(document.body.style.pointerEvents).toBe('none'));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Taps the overlay of the open dialog or drawer, with the events in browser order. */
export const tapOverlay = (pointerType: 'mouse' | 'touch') => {
  const overlay = document.querySelector(
    '[data-slot="dialog-overlay"], [data-slot="drawer-overlay"]',
  );
  if (!overlay) throw new Error('No dialog or drawer overlay is open.');

  fireEvent.pointerDown(overlay, { pointerType });
  fireEvent.pointerUp(overlay, { pointerType });
  fireEvent.click(overlay);
};
