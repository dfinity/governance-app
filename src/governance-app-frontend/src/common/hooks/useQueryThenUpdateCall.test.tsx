import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useQueryThenUpdateCall } from './useQueryThenUpdateCall';

const never = () => new Promise<string>(() => undefined);

describe('useQueryThenUpdateCall', () => {
  it('returns the fast query, not the placeholder of the update call', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => {
        const [caller, setCaller] = useState('anonymous');
        const query = useQueryThenUpdateCall({
          queryKey: ['proposal', caller],
          queryFn: async () => `query ${caller}`,
          // The first certified read ends, the one after the caller changes waits.
          updateFn: caller === 'anonymous' ? async () => 'update anonymous' : never,
          options: { placeholderData: (previous) => previous },
        });
        return { query, setCaller };
      },
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data?.response).toBe('update anonymous'));

    result.current.setCaller('user');

    await waitFor(() => expect(result.current.query.data?.response).toBe('query user'));
    expect(result.current.query.data?.certified).toBe(false);
  });

  it('keeps the certified placeholder while the fast query has no data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => {
        const [caller, setCaller] = useState('anonymous');
        const query = useQueryThenUpdateCall({
          queryKey: ['proposal', caller],
          // The fast read never ends, so only the certified read has data.
          queryFn: never,
          updateFn: caller === 'anonymous' ? async () => 'update anonymous' : never,
          options: { placeholderData: (previous) => previous },
        });
        return { query, setCaller };
      },
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data?.response).toBe('update anonymous'));

    act(() => result.current.setCaller('user'));

    expect(result.current.query.isPlaceholderData).toBe(true);
    expect(result.current.query.data?.response).toBe('update anonymous');
  });
});
