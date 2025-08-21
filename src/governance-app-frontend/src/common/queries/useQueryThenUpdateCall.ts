import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';

export enum QueryType {
  NonCertified = 'non-certified',
  Certified = 'certified',
}

export type CertifiedData<TData> = {
  data: TData;
  certified: boolean;
};

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
    data: await queryFn(),
    certified: false,
  });
  const queryQuery = useQuery({
    queryKey: [...queryKey, QueryType.NonCertified],
    queryFn: queryCall,
    ...options,
  });
  if (queryQuery.error) {
    console.log('Error fetching non-certified data.', queryKey, queryQuery.error);
  }

  const updateCall = async (): Promise<CertifiedData<TData>> => ({
    data: await updateFn(),
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
