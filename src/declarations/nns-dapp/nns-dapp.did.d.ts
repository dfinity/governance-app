import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface AccountDetails {
  principal: Principal;
  account_identifier: AccountIdentifier;
  hardware_wallet_accounts: Array<HardwareWalletAccountDetails>;
  sub_accounts: Array<SubAccountDetails>;
}
export type AccountIdentifier = string;
export type CreateSubAccountResponse =
  | { Ok: SubAccountDetails }
  | { AccountNotFound: null }
  | { NameTooLong: null }
  | { SubAccountLimitExceeded: null };
export type GetAccountResponse = { Ok: AccountDetails } | { AccountNotFound: null };
export interface HardwareWalletAccountDetails {
  principal: Principal;
  name: string;
  account_identifier: AccountIdentifier;
}
export interface RenameSubAccountRequest {
  new_name: string;
  account_identifier: AccountIdentifier;
}
export type RenameSubAccountResponse =
  | { Ok: null }
  | { AccountNotFound: null }
  | { SubAccountNotFound: null }
  | { NameTooLong: null };
export type SubAccount = Uint8Array | number[];
export interface SubAccountDetails {
  name: string;
  sub_account: SubAccount;
  account_identifier: AccountIdentifier;
}
export interface _SERVICE {
  add_account: ActorMethod<[], AccountIdentifier>;
  create_sub_account: ActorMethod<[string], CreateSubAccountResponse>;
  get_account: ActorMethod<[], GetAccountResponse>;
  rename_sub_account: ActorMethod<[RenameSubAccountRequest], RenameSubAccountResponse>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
