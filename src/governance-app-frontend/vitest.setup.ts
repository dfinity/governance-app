import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('CANISTER_ID_CKUSD_LEDGER', 'xevnm-gaaaa-aaaar-qafnq-cai');
vi.stubEnv('CANISTER_ID_ICP_LEDGER', 'ryjl3-tyaaa-aaaaa-aaaba-cai');

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
