import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';

import { MIN_ASYNC_DELAY } from '@constants/extra';
import { withMinimumDelay } from '@utils/async';
import { stringifyAll } from '@utils/strings';
import { CertifiedData, QueryType } from '@common/typings/queries';

type Props<TData> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  updateFn: () => Promise<TData>;
  options?: Omit<UseQueryOptions<CertifiedData<TData>>, 'queryKey' | 'queryFn'>;
};

export const useQueryThenUpdateCall = <TData>({
  queryKey,
  queryFn,
  updateFn,
  options,
}: Props<TData>) => {
  const queryCall = async (): Promise<CertifiedData<TData>> => ({
    response: await withMinimumDelay(queryFn(), MIN_ASYNC_DELAY),
    certified: false,
  });
  const queryQuery = useQuery({
    queryKey: [stringifyAll(queryKey), QueryType.NonCertified],
    queryFn: queryCall,
    ...options,
  });
  if (queryQuery.error) {
    console.log('Error fetching non-certified data.', queryKey, queryQuery.error);
  }

  const updateCall = async (): Promise<CertifiedData<TData>> => ({
    response: await withMinimumDelay(updateFn(), MIN_ASYNC_DELAY),
    certified: true,
  });
  const updateQuery = useQuery({
    queryKey: [stringifyAll(queryKey), QueryType.Certified],
    queryFn: updateCall,
    ...options,
  });
  if (updateQuery.error) {
    console.log('Error fetching certified data.', queryKey, updateQuery.error);
  }

  // In case of an error, try returning the other.
  if (updateQuery.error) {
    return queryQuery;
  } else if (queryQuery.error) {
    return updateQuery;
  }

  // Return the query call (fast) in case the update call (slow/certified) is still loading.
  return updateQuery.isLoading ? queryQuery : updateQuery;
};
