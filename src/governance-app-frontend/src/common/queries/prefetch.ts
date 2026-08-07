import { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import { CertifiedData } from '@common/typings/queries';

import {
  CertifiedQuery,
  certifiedQueryKey,
  nonCertifiedQueryKey,
  withCertifiedFlag,
} from './certified';

/**
 * Kicks off both legs of a certified query and returns immediately.
 *
 * Deliberately not awaited: the point is to have the request in flight while the
 * route's component chunk is still downloading. When the component mounts, its
 * `useQuery` finds either the resolved entry or the in-flight promise under the
 * same key and attaches to it rather than issuing a second call.
 *
 * `prefetchQuery` honours the client's `staleTime`, so a route that is
 * re-entered (or merely hovered, via `defaultPreload: 'intent'`) inside the
 * stale window costs nothing.
 */
export const prefetchCertifiedQuery = <TData>(
  queryClient: QueryClient,
  { queryKey, queryFn, updateFn }: CertifiedQuery<TData>,
): void => {
  void queryClient.prefetchQuery({
    queryKey: nonCertifiedQueryKey(queryKey),
    queryFn: () => withCertifiedFlag(queryFn(), false),
  });

  void queryClient.prefetchQuery({
    queryKey: certifiedQueryKey(queryKey),
    queryFn: () => withCertifiedFlag(updateFn(), true),
  });
};

export const prefetchCertifiedInfiniteQuery = <TData, TPageParam>(
  queryClient: QueryClient,
  { queryKey, queryFn, updateFn }: CertifiedQuery<TData, { pageParam: TPageParam }>,
  {
    initialPageParam,
    getNextPageParam,
  }: {
    initialPageParam: TPageParam;
    getNextPageParam: (lastPage: CertifiedData<TData>) => TPageParam | undefined;
  },
): void => {
  const prefetchPages = (
    key: QueryKey,
    fetchPage: (pageParam: TPageParam) => Promise<TData>,
    certified: boolean,
  ) =>
    queryClient.prefetchInfiniteQuery<
      CertifiedData<TData>,
      Error,
      InfiniteData<CertifiedData<TData>>,
      QueryKey,
      TPageParam
    >({
      queryKey: key,
      // `QueryFunctionContext` types `pageParam` through a conditional on
      // `TPageParam`, which stays unresolved while that parameter is still
      // generic here — hence the cast. `initialPageParam` below pins the value.
      queryFn: ({ pageParam }) => withCertifiedFlag(fetchPage(pageParam as TPageParam), certified),
      initialPageParam,
      getNextPageParam,
    });

  void prefetchPages(nonCertifiedQueryKey(queryKey), (pageParam) => queryFn({ pageParam }), false);
  void prefetchPages(certifiedQueryKey(queryKey), (pageParam) => updateFn({ pageParam }), true);
};
