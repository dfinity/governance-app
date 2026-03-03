import type { AddressType } from '@declarations/governance-app-backend/governance-app-backend.did';

export const addressBookGetAddressString = (address: AddressType | undefined): string => {
  if (address === undefined) return '';
  if ('Icp' in address) return address.Icp;
  if ('Icrc1' in address) return address.Icrc1;
  return '';
};

export const addressBookIsIcpAddress = (address: AddressType): boolean => 'Icp' in address;
