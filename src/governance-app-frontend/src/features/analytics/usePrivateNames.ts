import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';

/**
 * Returns the names that the user gave: the address book names, the sub-account names, and the
 * Ledger device account names. Analytics must not receive these names.
 * Returns `undefined` until all the names load.
 */
export const usePrivateNames = (): string[] | undefined => {
  const addressBook = useAddressBook().data?.response;
  // Not the account metadata hooks: they return no names when the feature is off.
  const nnsDappAccount = useNnsDappAccount().data;
  if (addressBook === undefined || nnsDappAccount === undefined) return undefined;

  // `null` when the user has no NNS dapp account.
  const account = nnsDappAccount.response;
  return [
    ...addressBook.named_addresses.map(({ name }) => name),
    ...(account?.sub_accounts ?? []).map(({ name }) => name),
    ...(account?.hardware_wallet_accounts ?? []).map(({ name }) => name),
  ];
};
