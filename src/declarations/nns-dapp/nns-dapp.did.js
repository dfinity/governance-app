export const idlFactory = ({ IDL }) => {
  const AccountIdentifier = IDL.Text;
  const SubAccount = IDL.Vec(IDL.Nat8);
  const SubAccountDetails = IDL.Record({
    name: IDL.Text,
    sub_account: SubAccount,
    account_identifier: AccountIdentifier,
  });
  const CreateSubAccountResponse = IDL.Variant({
    Ok: SubAccountDetails,
    AccountNotFound: IDL.Null,
    NameTooLong: IDL.Null,
    SubAccountLimitExceeded: IDL.Null,
  });
  const HardwareWalletAccountDetails = IDL.Record({
    principal: IDL.Principal,
    name: IDL.Text,
    account_identifier: AccountIdentifier,
  });
  const AccountDetails = IDL.Record({
    principal: IDL.Principal,
    account_identifier: AccountIdentifier,
    hardware_wallet_accounts: IDL.Vec(HardwareWalletAccountDetails),
    sub_accounts: IDL.Vec(SubAccountDetails),
  });
  const GetAccountResponse = IDL.Variant({
    Ok: AccountDetails,
    AccountNotFound: IDL.Null,
  });
  const RenameSubAccountRequest = IDL.Record({
    new_name: IDL.Text,
    account_identifier: AccountIdentifier,
  });
  const RenameSubAccountResponse = IDL.Variant({
    Ok: IDL.Null,
    AccountNotFound: IDL.Null,
    SubAccountNotFound: IDL.Null,
    NameTooLong: IDL.Null,
  });
  return IDL.Service({
    add_account: IDL.Func([], [AccountIdentifier], []),
    create_sub_account: IDL.Func([IDL.Text], [CreateSubAccountResponse], []),
    get_account: IDL.Func([], [GetAccountResponse], ['query']),
    rename_sub_account: IDL.Func([RenameSubAccountRequest], [RenameSubAccountResponse], []),
  });
};
export const init = ({ IDL }) => {
  return [];
};
