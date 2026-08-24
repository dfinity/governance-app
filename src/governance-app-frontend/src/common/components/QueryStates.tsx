import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useDelayedFlag } from '@hooks/useDelayedFlag';

import { EmptyMessage } from './EmptyMessage';
import { MultipleSkeletons } from './MultipleSkeletons';
import { WarningMessage } from './WarningMessage';

type InfiniteQueryData<TData = unknown> = Partial<InfiniteData<TData, unknown>>;

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
        UseInfiniteQueryResult<InfiniteQueryData<TData>, Error>,
        'data' | 'isLoading' | 'error'
      >;
      isEmpty: (data: InfiniteQueryData<TData>) => boolean;
      children: (data: InfiniteQueryData<TData>) => React.ReactNode;
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
  const showLoading = useDelayedFlag(q.isLoading);

  if (q.isLoading) {
    // Hold the frame empty until the delay elapses rather than flashing a skeleton.
    return showLoading ? loadingComponent || <MultipleSkeletons count={3} /> : null;
  }

  if (q.error) {
    return errorComponent || <WarningMessage message={t(($) => $.common.loadingError)} />;
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
