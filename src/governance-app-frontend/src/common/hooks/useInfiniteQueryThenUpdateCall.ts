import {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { MIN_ASYNC_DELAY } from '@constants/extra';
import { withMinimumDelay } from '@utils/async';
import { stringifyKeys } from '@utils/query';
import { CertifiedData, QueryType } from '@common/typings/queries';

type QueryOptions<TData, TPageParam> = UseInfiniteQueryOptions<
  CertifiedData<TData>,
  Error,
  InfiniteData<CertifiedData<TData>>,
  QueryKey,
  TPageParam
>;

type OptionsOmit<TData, TPageParam> = Omit<
  QueryOptions<TData, TPageParam>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
>;

type Props<TData, TPageParam> = {
  queryKey: QueryKey;
  queryFn: (context: QueryFunctionContext<QueryKey, TPageParam>) => Promise<TData>;
  updateFn: (context: QueryFunctionContext<QueryKey, TPageParam>) => Promise<TData>;
  initialPageParam: TPageParam;
  getNextPageParam: QueryOptions<TData, TPageParam>['getNextPageParam'];
  options?: OptionsOmit<TData, TPageParam>;
  /** Override options for the update (certified) query only. Merged on top of `options`. */
  updateOptions?: Partial<OptionsOmit<TData, TPageParam>>;
};

export const useInfiniteQueryThenUpdateCall = <TData, TPageParam>({
  queryKey,
  queryFn,
  updateFn,
  initialPageParam,
  getNextPageParam,
  options,
  updateOptions,
}: Props<TData, TPageParam>) => {
  const queryCall = async (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ): Promise<CertifiedData<TData>> => ({
    response: await withMinimumDelay(queryFn(context), MIN_ASYNC_DELAY),
    certified: false,
  });
  const queryQuery = useInfiniteQuery<
    CertifiedData<TData>,
    Error,
    InfiniteData<CertifiedData<TData>>,
    QueryKey,
    TPageParam
  >({
    queryKey: [...stringifyKeys(queryKey), QueryType.NonCertified],
    queryFn: queryCall,
    initialPageParam,
    getNextPageParam,
    ...options,
  });

  const { fetchNextPage: fetchNextPageQuery, error: errorQuery, data: dataQuery } = queryQuery;
  if (errorQuery) {
    console.log('Error fetching non-certified data.', queryKey, errorQuery);
  }

  const updateCall = async (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ): Promise<CertifiedData<TData>> => ({
    response: await withMinimumDelay(updateFn(context), MIN_ASYNC_DELAY),
    certified: true,
  });
  const updateQuery = useInfiniteQuery({
    queryKey: [...stringifyKeys(queryKey), QueryType.Certified],
    queryFn: updateCall,
    initialPageParam,
    getNextPageParam,
    ...options,
    ...updateOptions,
  });

  const { fetchNextPage: fetchNextPageUpdate, error: errorUpdate, data: dataUpdate } = updateQuery;
  if (errorUpdate) {
    console.log('Error fetching certified data.', queryKey, errorUpdate);
  }

  const fetchNextPage = useCallback(() => {
    // Fetch both as soon as possible.
    // Can be called multiple times, if a fetch is already ongoing, nothing happens.
    fetchNextPageQuery({ cancelRefetch: false });
    fetchNextPageUpdate({ cancelRefetch: false });
  }, [fetchNextPageQuery, fetchNextPageUpdate]);

  // Keep pages in sync in case they go out of sync.
  // E.g. if a fetchNextPage is called while only 1 of the 2 queries was still ongoing.
  const queryPages = dataQuery?.pages.length || 0;
  const updatePages = dataUpdate?.pages.length || 0;
  useEffect(() => {
    if (queryPages > updatePages) {
      fetchNextPageUpdate({ cancelRefetch: false });
    } else if (updatePages > queryPages) {
      fetchNextPageQuery({ cancelRefetch: false });
    }
  }, [queryPages, updatePages, fetchNextPageQuery, fetchNextPageUpdate]);

  // In case of an error, try returning the other.
  if (errorUpdate) {
    return queryQuery;
  } else if (errorQuery) {
    return updateQuery;
  }

  // Return the query call (fast), and then hot-swap data pages as they get progressively certified.
  return {
    ...queryQuery,
    fetchNextPage,
    data: {
      ...dataQuery,
      pages: dataQuery?.pages.map((page, index) => dataUpdate?.pages[index] ?? page),
    },
  };
};
