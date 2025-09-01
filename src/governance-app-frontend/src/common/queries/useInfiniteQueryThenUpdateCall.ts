import {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { stringifyAll } from '@utils/strings';
import { CertifiedData, QueryType } from '@common/typings/queries';

type QueryOptions<TData, TPageParam> = UseInfiniteQueryOptions<
  CertifiedData<TData>,
  Error,
  InfiniteData<CertifiedData<TData>>,
  QueryKey,
  TPageParam
>;

type Props<TData, TPageParam> = {
  queryKey: QueryKey;
  queryFn: (context: QueryFunctionContext<QueryKey, TPageParam>) => Promise<TData>;
  updateFn: (context: QueryFunctionContext<QueryKey, TPageParam>) => Promise<TData>;
  initialPageParam: TPageParam;
  getNextPageParam: QueryOptions<TData, TPageParam>['getNextPageParam'];
  options?: Omit<
    QueryOptions<TData, TPageParam>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >;
};

export const useInfiniteQueryThenUpdateCall = <TData, TPageParam>({
  queryKey,
  queryFn,
  updateFn,
  initialPageParam,
  getNextPageParam,
  options,
}: Props<TData, TPageParam>) => {
  const queryCall = async (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ): Promise<CertifiedData<TData>> => ({
    response: await queryFn(context),
    certified: false,
  });
  const queryQuery = useInfiniteQuery<
    CertifiedData<TData>,
    Error,
    InfiniteData<CertifiedData<TData>>,
    QueryKey,
    TPageParam
  >({
    queryKey: [stringifyAll(queryKey), QueryType.NonCertified],
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
    response: await updateFn(context),
    certified: true,
  });
  const updateQuery = useInfiniteQuery({
    queryKey: [...queryKey, QueryType.Certified],
    queryFn: updateCall,
    initialPageParam,
    getNextPageParam,
    ...options,
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
