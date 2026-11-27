import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAGS_STORAGE_KEY, type FeatureFlag } from '@constants/featureFlags';
import { getStorageItem } from '@utils/storage';

import { isFeatureFlagEnabled } from './featureFlags';

vi.mock('@utils/storage', () => ({ getStorageItem: vi.fn() }));
vi.mock('@constants/featureFlags', () => ({
  FEATURE_FLAGS_STORAGE_KEY: 'nns-feature-flags',
  FEATURE_FLAG_DEFAULTS: { testFeature: false },
}));

/** `FeatureFlag` has no member while no feature waits for a release. */
const TEST_FLAG = 'testFeature' as unknown as FeatureFlag;

const stored = (value: string | null) => vi.mocked(getStorageItem).mockReturnValue(value);

describe('isFeatureFlagEnabled', () => {
  beforeEach(() => {
    vi.mocked(getStorageItem).mockReset();
  });

  it('is off by default', () => {
    stored(null);

    expect(isFeatureFlagEnabled(TEST_FLAG)).toBe(false);
    expect(getStorageItem).toHaveBeenCalledWith(FEATURE_FLAGS_STORAGE_KEY);
  });

  it('follows a boolean override', () => {
    stored('{"testFeature":true}');

    expect(isFeatureFlagEnabled(TEST_FLAG)).toBe(true);
  });

  it('ignores an override that is not a boolean', () => {
    stored('{"testFeature":"yes"}');

    expect(isFeatureFlagEnabled(TEST_FLAG)).toBe(false);
  });

  it('ignores a value that is not JSON', () => {
    stored('testFeature');

    expect(isFeatureFlagEnabled(TEST_FLAG)).toBe(false);
  });
});
