import { CertifiedData } from '@common/queries/useQueryThenCertifyCall';
import { UseQueryOptions } from '@tanstack/react-query';

export type QueryOptions<TData> = Omit<
  UseQueryOptions<CertifiedData<TData>>,
  'queryKey' | 'queryFn'
>;
