import { UseQueryOptions } from '@tanstack/react-query';

export type QueryOptions<TData> = Omit<
  UseQueryOptions<CertifiedData<TData>>,
  'queryKey' | 'queryFn'
>;

export enum QueryType {
  NonCertified = 'non-certified',
  Certified = 'certified',
}

export type CertifiedData<TData> = {
  response: TData;
  certified: boolean;
};
