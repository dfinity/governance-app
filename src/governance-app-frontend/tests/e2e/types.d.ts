declare global {
  interface Window {
    /** Set to true during Playwright e2e tests. */
    isPlaywright?: boolean;
  }
}

export {};
