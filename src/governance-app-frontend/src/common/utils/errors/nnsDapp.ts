import type {
  CreateSubAccountResponse,
  RenameSubAccountResponse,
} from '@declarations/nns-dapp/nns-dapp.did';

import i18n from '@/i18n/config';

type SubAccountErrorResponse =
  | Exclude<CreateSubAccountResponse, { Ok: unknown }>
  | Exclude<RenameSubAccountResponse, { Ok: unknown }>;

export const mapSubAccountError = (response: SubAccountErrorResponse, fallback: string): string => {
  const t = i18n.t;

  if ('AccountNotFound' in response) return t(($) => $.accounts.errors.accountNotFound);
  if ('NameTooLong' in response) return t(($) => $.accounts.errors.nameTooLong);
  if ('SubAccountLimitExceeded' in response) return t(($) => $.accounts.errors.limitExceeded);
  if ('SubAccountNotFound' in response) return t(($) => $.accounts.errors.subAccountNotFound);

  return fallback;
};
