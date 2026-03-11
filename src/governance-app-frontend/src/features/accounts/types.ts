export interface AccountMeta {
  name: string;
  accountId: string;
  isMain: boolean;
}

export interface MainAccountMeta extends AccountMeta {
  isMain: true;
}

export interface SubaccountMeta extends AccountMeta {
  isMain: false;
}

export interface AccountWithBalance extends AccountMeta {
  balanceE8s: bigint;
}

export interface AccountBalanceState {
  data?: bigint;
  certified?: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
}

export interface AccountsState {
  accounts: AccountWithBalance[];
  totalBalanceE8s: bigint;
  hasSubaccounts: boolean;
  mainAccountId?: string;
  balancesByAccountId: Record<string, AccountBalanceState>;
}

export interface AccountTransaction {
  id: bigint;
  type: 'send' | 'receive' | 'stake';
  amountE8s: bigint;
  timestamp: number;
  accountId: string;
  accountName: string;
}
