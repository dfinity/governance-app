import { UseQueryOptions } from '@tanstack/react-query';

import { CertifiedData } from '@queries/useQueryThenUpdateCall';

export type QueryOptions<TData> = Omit<
  UseQueryOptions<CertifiedData<TData>>,
  'queryKey' | 'queryFn'
>;
