export interface Subaccount {
  name: string;
  subaccountIndex: number;
  balanceE8s: bigint;
}

export const MOCK_SUBACCOUNTS: Subaccount[] = [
  { name: 'Main', subaccountIndex: 0, balanceE8s: 1_250_000_000n },
  { name: 'Savings', subaccountIndex: 1, balanceE8s: 5_800_000_000n },
  { name: 'Trading', subaccountIndex: 2, balanceE8s: 320_000_000n },
  { name: 'Rewards', subaccountIndex: 3, balanceE8s: 45_000_000n },
];
