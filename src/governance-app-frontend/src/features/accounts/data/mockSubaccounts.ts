export interface Subaccount {
  name: string;
  subaccountIndex: number;
  accountId: string;
  balanceE8s: bigint;
}

export const MOCK_SUBACCOUNTS: Subaccount[] = [
  { name: 'Main', subaccountIndex: 0, accountId: 'a3e2f7c8d1b04e6a9f5c2d8e1b7a4f0c3d6e9a2b5c8f1d4e7a0b3c6f9d2e5a8', balanceE8s: 1_250_000_000n },
  { name: 'Savings', subaccountIndex: 1, accountId: 'b4f3a8d9e2c15f7b0a6d3e9f2c8b5a1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9', balanceE8s: 5_800_000_000n },
  { name: 'Trading', subaccountIndex: 2, accountId: 'c5a4b9e0f3d26a8c1b7e4f0a3d9c6b2e5f8a1b4d7c0e3f6a9b2c5d8e1f4a7b0', balanceE8s: 320_000_000n },
  { name: 'Rewards', subaccountIndex: 3, accountId: 'd6b5c0f1a4e37b9d2c8f5a1b4e0d7c3f6a9b2c5e8d1f4a7b0c3d6e9f2a5b8c1', balanceE8s: 45_000_000n },
];
