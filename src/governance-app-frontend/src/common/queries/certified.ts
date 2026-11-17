import { QueryKey } from '@tanstack/react-query';

import { stringifyKeys } from '@utils/query';
import { CertifiedData, QueryType } from '@common/typings/queries';

/**
 * A query that exists twice in the cache: once for the fast non-certified read
 * and once for the slow certified one. Defined in one place so hooks and route
 * loaders cannot drift apart on the cache key — a mismatch there would silently
 * turn a prefetch into a wasted call.
 */
export type CertifiedQuery<TData, TContext = void> = {
  queryKey: QueryKey;
  queryFn: (context: TContext) => Promise<TData>;
  updateFn: (context: TContext) => Promise<TData>;
};

export const nonCertifiedQueryKey = (queryKey: QueryKey): QueryKey => [
  ...stringifyKeys(queryKey),
  QueryType.NonCertified,
];

export const certifiedQueryKey = (queryKey: QueryKey): QueryKey => [
  ...stringifyKeys(queryKey),
  QueryType.Certified,
];

export const withCertifiedFlag = async <TData>(
  response: Promise<TData>,
  certified: boolean,
): Promise<CertifiedData<TData>> => ({
  response: await response,
  certified,
});
