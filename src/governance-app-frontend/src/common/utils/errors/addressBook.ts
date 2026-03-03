import type { SetAddressBookResponse } from '@declarations/governance-app-backend/governance-app-backend.did';

import i18n from '@/i18n/config';

export const mapSetAddressBookError = (response: SetAddressBookResponse): string => {
  const t = i18n.t;

  if ('AnonymousNotAllowed' in response) {
    return t(($) => $.addressBook.toast.anonymousNotAllowed);
  }
  if ('TooManyNamedAddresses' in response) {
    return t(($) => $.addressBook.toast.tooMany, { limit: response.TooManyNamedAddresses.limit });
  }
  if ('InvalidIcpAddress' in response) {
    return t(($) => $.addressBook.toast.invalidIcp, { error: response.InvalidIcpAddress.error });
  }
  if ('InvalidIcrc1Address' in response) {
    return t(($) => $.addressBook.toast.invalidIcrc1, {
      error: response.InvalidIcrc1Address.error,
    });
  }
  if ('AddressNameTooShort' in response) {
    return t(($) => $.addressBook.toast.nameTooShort, {
      minLength: response.AddressNameTooShort.min_length,
    });
  }
  if ('AddressNameTooLong' in response) {
    return t(($) => $.addressBook.toast.nameTooLong, {
      maxLength: response.AddressNameTooLong.max_length,
    });
  }
  if ('DuplicateAddressName' in response) {
    return t(($) => $.addressBook.toast.duplicateName, {
      name: response.DuplicateAddressName.name,
    });
  }

  return t(($) => $.addressBook.toast.saveError);
};
