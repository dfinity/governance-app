import { UseQueryOptions } from '@tanstack/react-query';

import { CertifiedData } from '@common/queries/useQueryThenUpdateCall';

export type QueryOptions<TData> = Omit<
  UseQueryOptions<CertifiedData<TData>>,
  'queryKey' | 'queryFn'
>;
