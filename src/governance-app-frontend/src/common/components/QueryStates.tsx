import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { EmptyMessage } from './EmptyMessage';
import { SkeletonScreen } from './skeletons/SkeletonScreen';
import { SkeletonText } from './skeletons/SkeletonText';
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

  if (q.isLoading) {
    // The loader holds its space at once and reveals itself after a short
    // delay, so a fast query shows no flash. See `.skeleton` and
    // `.reveal-delayed` in `main.css`. Wrap a custom skeleton in
    // `SkeletonScreen` so screen readers hear "loading".
    if (loadingComponent) return <div className="reveal-delayed">{loadingComponent}</div>;

    return (
      <SkeletonScreen>
        <SkeletonText lines={3} />
      </SkeletonScreen>
    );
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
