import type { CreateSubAccountResponse } from '@declarations/nns-dapp/nns-dapp.did';

import i18n from '@/i18n/config';

export const mapCreateSubAccountError = (response: CreateSubAccountResponse): string => {
  const t = i18n.t;

  if ('AccountNotFound' in response) {
    return t(($) => $.accounts.createSubAccount.errorAccountNotFound);
  }
  if ('SubAccountLimitExceeded' in response) {
    return t(($) => $.accounts.createSubAccount.errorLimitExceeded);
  }
  if ('NameTooLong' in response) {
    return t(($) => $.accounts.createSubAccount.errorNameTooLong);
  }

  return t(($) => $.accounts.createSubAccount.error);
};
