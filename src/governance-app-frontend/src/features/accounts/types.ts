export interface Subaccount {
  name: string;
  accountId: string;
  balanceE8s: bigint;
  isMain: boolean;
}

export interface AccountTransaction {
  id: bigint;
  type: 'send' | 'receive' | 'stake';
  amountE8s: bigint;
  timestamp: number;
  accountName: string;
}
