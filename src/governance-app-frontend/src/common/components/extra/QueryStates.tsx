import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { EmptyMessage } from './EmptyMessage';
import { WarningMessage } from './WarningMessage';

type infiniteQueryData<TData = unknown> = Partial<InfiniteData<TData, unknown>>;

type Props<TData> = (
  | {
      query: UseQueryResult<TData>;
      infiniteQuery?: undefined;
      isEmpty: (data: TData) => boolean;
      children: (data: TData) => React.ReactNode;
    }
  | {
      query?: undefined;
      infiniteQuery: Pick<
        UseInfiniteQueryResult<infiniteQueryData<TData>, Error>,
        'data' | 'isLoading' | 'error'
      >;
      isEmpty: (data: infiniteQueryData<TData>) => boolean;
      children: (data: infiniteQueryData<TData>) => React.ReactNode;
    }
) & {
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
};

export const QueryStates = <TData,>({
  query,
  infiniteQuery,
  isEmpty,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}: Props<TData>) => {
  const { t } = useTranslation();
  const q = query || infiniteQuery;

  if (q.isLoading) {
    return loadingComponent || <Skeleton count={3} />;
  }

  if (q.error) {
    return (
      errorComponent || (
        <WarningMessage
          message={t(($) => $.common.loadingError, {
            error: q.error.message,
          })}
        />
      )
    );
  }

  if (query) {
    if (!query.data || isEmpty(query.data)) {
      return emptyComponent || <EmptyMessage message={t(($) => $.common.noData)} />;
    }
    return children(query.data);
  } else {
    if (!infiniteQuery.data?.pages || isEmpty(infiniteQuery.data)) {
      return emptyComponent || <EmptyMessage message={t(($) => $.common.noData)} />;
    }
    return children(infiniteQuery.data);
  }
};
