import { TransactionType } from '@features/account/types';

export { TransactionType };

export enum SubAccountDialogMode {
  Create = 'create',
  Rename = 'rename',
}

export enum AccountType {
  Main = 'main',
  Subaccount = 'subaccount',
}

export interface AccountMetadata {
  name: string;
  accountId: string;
  type: AccountType;
}

export type AccountReady = AccountMetadata & {
  status: 'ready';
  balanceE8s: bigint;
};

export type AccountLoading = AccountMetadata & {
  status: 'loading';
};

export type AccountError = AccountMetadata & {
  status: 'error';
  error: unknown;
};

export type Account = AccountReady | AccountLoading | AccountError;

export interface AccountsState {
  accounts: Account[];
  totalBalanceE8s: bigint;
  isTotalPartial: boolean;
  hasSubaccounts: boolean;
  mainAccountId?: string;
}

export interface AccountTransaction {
  id: bigint;
  type: TransactionType;
  amountE8s: bigint;
  timestamp: number;
  accountId: string;
  accountName: string;
}
