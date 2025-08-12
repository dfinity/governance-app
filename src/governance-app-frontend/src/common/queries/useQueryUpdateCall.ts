import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';

export enum QueryType {
  NonCertified = 'non-certified',
  Certified = 'certified',
}

type CertifiedData<TData> = {
  data: TData;
  certified: boolean;
};

type Props<TData> = {
  key: QueryKey;
  queryFn: () => Promise<TData>;
  updateFn: () => Promise<TData>;
  options?: Omit<UseQueryOptions<CertifiedData<TData>>, 'queryKey' | 'queryFn'>;
};

export const useQueryUpdateCall = <TData>({ key, queryFn, updateFn, options }: Props<TData>) => {
  const fastCall = async (): Promise<CertifiedData<TData>> => ({
    data: await queryFn(),
    certified: false,
  });
  const fastQuery = useQuery({
    queryKey: [...key, QueryType.NonCertified],
    queryFn: fastCall,
    ...options,
  });
  if (fastQuery.error) {
    console.log('Error fetching non-certified data for', key, fastQuery.error);
  }

  const certifiedCall = async (): Promise<CertifiedData<TData>> => ({
    data: await updateFn(),
    certified: true,
  });
  const certifiedQuery = useQuery({
    queryKey: [...key, QueryType.Certified],
    queryFn: certifiedCall,
    ...options,
  });
  if (certifiedQuery.error) {
    console.log('Error fetching certified data for', key, certifiedQuery.error);
  }

  // Return the query call (fast) in case the update call (slow/certified) is still loading or had an error,
  // otherwise use the certified data
  return certifiedQuery.isFetching || certifiedQuery.isError ? fastQuery : certifiedQuery;
};
