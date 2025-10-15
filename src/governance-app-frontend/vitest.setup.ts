import dotenv from 'dotenv';
import { vi } from 'vitest';

// Load environment variables from the root .env file
dotenv.config({ path: '../../.env', quiet: true });

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
