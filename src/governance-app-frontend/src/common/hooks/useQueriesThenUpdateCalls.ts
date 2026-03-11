import { type QueryKey, useQueries } from '@tanstack/react-query';

import { stringifyKeys } from '@utils/query';
import { type CertifiedData, QueryType } from '@common/typings/queries';

export type QueriesThenUpdateItemState<TData> = {
  data?: CertifiedData<TData>;
  certified?: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
};

type Props<TItem, TData> = {
  items: TItem[];
  getItemKey: (item: TItem) => string;
  getQueryKey: (item: TItem) => QueryKey;
  queryFn: (item: TItem) => Promise<TData>;
  updateFn: (item: TItem) => Promise<TData>;
  enabled?: boolean;
};

export const useQueriesThenUpdateCalls = <TItem, TData>({
  items,
  getItemKey,
  getQueryKey,
  queryFn,
  updateFn,
  enabled = true,
}: Props<TItem, TData>) => {
  const queryCalls = useQueries({
    queries: items.map((item) => ({
      queryKey: [...stringifyKeys(getQueryKey(item)), QueryType.NonCertified],
      queryFn: async (): Promise<CertifiedData<TData>> => ({
        response: await queryFn(item),
        certified: false,
      }),
      enabled,
    })),
  });

  const updateCalls = useQueries({
    queries: items.map((item) => ({
      queryKey: [...stringifyKeys(getQueryKey(item)), QueryType.Certified],
      queryFn: async (): Promise<CertifiedData<TData>> => ({
        response: await updateFn(item),
        certified: true,
      }),
      enabled,
    })),
  });

  const byItemKey: Record<string, QueriesThenUpdateItemState<TData>> = {};

  items.forEach((item, index) => {
    const key = getItemKey(item);
    const queryCall = queryCalls[index];
    const updateCall = updateCalls[index];
    const mergedData = updateCall.data ?? queryCall.data;
    const isError = !mergedData && (!!queryCall.error || !!updateCall.error);

    byItemKey[key] = {
      data: mergedData,
      certified: mergedData?.certified,
      isLoading: !mergedData && (queryCall.isLoading || updateCall.isLoading),
      isFetching: queryCall.isFetching || updateCall.isFetching,
      isError,
      error: isError ? (updateCall.error ?? queryCall.error) : undefined,
    };
  });

  return {
    byItemKey,
    queryCalls,
    updateCalls,
    isLoadingAny: Object.values(byItemKey).some((state) => state.isLoading),
    isFetchingAny: Object.values(byItemKey).some((state) => state.isFetching),
    hasAnyError: Object.values(byItemKey).some((state) => state.isError),
  };
};
