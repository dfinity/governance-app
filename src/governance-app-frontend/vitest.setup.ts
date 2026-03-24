import dotenv from 'dotenv';
import React from 'react';
import { vi } from 'vitest';

// Load environment variables from the root .env file
dotenv.config({ path: '../../.env', quiet: true });

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock react-i18next — returns translation keys so tests can assert on them.
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (keyOrFn: unknown, opts?: { returnObjects?: boolean }) => {
        if (typeof keyOrFn === 'function') {
          const result = (keyOrFn as (t: Record<string, unknown>) => unknown)(
            new Proxy(
              {},
              {
                get: (_target, prop: string) =>
                  new Proxy(
                    {},
                    {
                      get: (_t2, prop2: string) => `${prop}.${prop2}`,
                      [Symbol.toPrimitive]: () => `${prop}`,
                    },
                  ),
              },
            ),
          );
          if (opts?.returnObjects) return {};
          return result;
        }
        return keyOrFn;
      },
    }),
  };
});

// Mock Tooltip — render children directly without Radix portal overhead.
vi.mock('@components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', null, children),
}));
