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
  uncertifiedFn: () => Promise<TData>;
  certifiedFn: () => Promise<TData>;
  options?: Omit<UseQueryOptions<CertifiedData<TData>>, 'queryKey' | 'queryFn'>;
};

export const useQueryThenCertifyCall = <TData>({
  queryKey,
  uncertifiedFn,
  certifiedFn,
  options,
}: Props<TData>) => {
  const uncertifiedCall = async (): Promise<CertifiedData<TData>> => ({
    data: await uncertifiedFn(),
    certified: false,
  });
  const uncertifiedQuery = useQuery({
    queryKey: [...queryKey, QueryType.NonCertified],
    queryFn: uncertifiedCall,
    ...options,
  });
  if (uncertifiedQuery.error) {
    console.log('Error fetching non-certified data.', queryKey, uncertifiedQuery.error);
  }

  const certifiedCall = async (): Promise<CertifiedData<TData>> => ({
    data: await certifiedFn(),
    certified: true,
  });
  const certifiedQuery = useQuery({
    queryKey: [...queryKey, QueryType.Certified],
    queryFn: certifiedCall,
    ...options,
  });
  if (certifiedQuery.error) {
    console.log('Error fetching certified data.', queryKey, certifiedQuery.error);
  }

  // Return the query call (fast) in case the update call (slow/certified) is still loading or had an error,
  // otherwise use the certified data
  return certifiedQuery.isFetching || certifiedQuery.isError ? uncertifiedQuery : certifiedQuery;
};
