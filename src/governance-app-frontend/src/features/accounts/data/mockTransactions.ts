export interface MockTransaction {
  id: number;
  type: 'send' | 'receive';
  amountE8s: bigint;
  timestamp: number;
  subaccountName: string;
}

const now = Math.floor(Date.now() / 1000);
const HOUR = 3600;
const DAY = 86400;

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: 1, type: 'receive', amountE8s: 350_000_000n, timestamp: now - 2 * HOUR, subaccountName: 'Main' },
  { id: 2, type: 'send', amountE8s: 120_000_000n, timestamp: now - 5 * HOUR, subaccountName: 'Trading' },
  { id: 3, type: 'receive', amountE8s: 1_000_000_000n, timestamp: now - 1 * DAY, subaccountName: 'Savings' },
  { id: 4, type: 'send', amountE8s: 50_000_000n, timestamp: now - 1 * DAY - 3 * HOUR, subaccountName: 'Rewards' },
  { id: 5, type: 'receive', amountE8s: 200_000_000n, timestamp: now - 2 * DAY, subaccountName: 'Main' },
  { id: 6, type: 'send', amountE8s: 75_000_000n, timestamp: now - 3 * DAY, subaccountName: 'Trading' },
];
