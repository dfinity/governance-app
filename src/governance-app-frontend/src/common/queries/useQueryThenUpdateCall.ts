import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';

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
    response: await queryFn(),
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
    response: await updateFn(),
    certified: true,
  });
  const updateQuery = useQuery({
    queryKey: [...queryKey, QueryType.Certified],
    queryFn: updateCall,
    ...options,
  });
  if (updateQuery.error) {
    console.log('Error fetching certified data.', queryKey, updateQuery.error);
  }

  // Return the query call (fast) in case the update call (slow/certified) is still loading or had an error,
  // otherwise use the certified data
  return updateQuery.isFetching || updateQuery.isError ? queryQuery : updateQuery;
};
