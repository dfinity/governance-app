export type AccountType = 'main' | 'subaccount';

export interface AccountMeta {
  name: string;
  accountId: string;
  type: AccountType;
}

export type AccountReady = AccountMeta & {
  status: 'ready';
  balanceE8s: bigint;
};

export type AccountLoading = AccountMeta & {
  status: 'loading';
};

export type AccountError = AccountMeta & {
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
  type: 'send' | 'receive' | 'stake';
  amountE8s: bigint;
  timestamp: number;
  accountId: string;
  accountName: string;
}
