import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADVANCED_FEATURES_DEFAULTS } from '@typings/advancedFeatures';

import { isAccountPickerEnabled } from './advancedFeatures';

const features = (overrides: { subaccounts?: boolean; ledgerDevice?: boolean }) => ({
  ...ADVANCED_FEATURES_DEFAULTS,
  ...overrides,
});

const withWebHid = (supported: boolean) => {
  if (supported) {
    vi.stubGlobal('navigator', { ...navigator, hid: {} });
  } else {
    const stub = { ...navigator } as Navigator & { hid?: unknown };
    delete stub.hid;
    vi.stubGlobal('navigator', stub);
  }
};

describe('isAccountPickerEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is off with the defaults', () => {
    withWebHid(true);

    expect(isAccountPickerEnabled(features({}))).toBe(false);
  });

  it('is on with "Multiple accounts", with or without WebHID', () => {
    withWebHid(false);

    expect(isAccountPickerEnabled(features({ subaccounts: true }))).toBe(true);
  });

  it('is on with "Ledger device" only in a browser with WebHID', () => {
    withWebHid(true);
    expect(isAccountPickerEnabled(features({ ledgerDevice: true }))).toBe(true);

    withWebHid(false);
    expect(isAccountPickerEnabled(features({ ledgerDevice: true }))).toBe(false);
  });
});
