import {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

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
  if (queryQuery.error) {
    console.log('Error fetching non-certified data.', queryKey, queryQuery.error);
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
  if (updateQuery.error) {
    console.log('Error fetching certified data.', queryKey, updateQuery.error);
  }

  const {
    data: dataQuery,
    fetchNextPage: fetchNextPageQuery,
    hasNextPage: hasNextPageQuery,
  } = queryQuery;
  const {
    data: dataUpdate,
    fetchNextPage: fetchNextPageUpdate,
    hasNextPage: hasNextPageUpdate,
  } = updateQuery;

  const fetchNextPage = useCallback(() => {
    fetchNextPageQuery({ cancelRefetch: false });
    fetchNextPageUpdate({ cancelRefetch: false });
  }, [fetchNextPageQuery, fetchNextPageUpdate]);

  if (updateQuery.error) {
    return queryQuery;
  } else {
    const maxLen = Math.max(dataQuery?.pages.length || 0, dataUpdate?.pages.length || 0);

    return {
      ...queryQuery,
      hasNextPage: hasNextPageQuery || hasNextPageUpdate,
      fetchNextPage,
      data: {
        pageParams: Array.from(
          { length: maxLen },
          (_, i) => dataUpdate?.pageParams[i] || dataQuery?.pageParams[i],
        ),
        pages: Array.from(
          { length: maxLen },
          (_, i) => dataUpdate?.pages[i] || dataQuery?.pages[i],
        ),
      },
    };
  }
};
