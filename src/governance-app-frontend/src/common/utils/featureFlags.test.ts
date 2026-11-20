import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAGS_STORAGE_KEY, FeatureFlag } from '@constants/featureFlags';
import { getStorageItem } from '@utils/storage';

import { isFeatureFlagEnabled } from './featureFlags';

vi.mock('@utils/storage', () => ({ getStorageItem: vi.fn() }));

const stored = (value: string | null) => vi.mocked(getStorageItem).mockReturnValue(value);

describe('isFeatureFlagEnabled', () => {
  beforeEach(() => {
    vi.mocked(getStorageItem).mockReset();
  });

  it('is off by default', () => {
    stored(null);

    expect(isFeatureFlagEnabled(FeatureFlag.Reports)).toBe(false);
    expect(getStorageItem).toHaveBeenCalledWith(FEATURE_FLAGS_STORAGE_KEY);
  });

  it('follows a boolean override', () => {
    stored('{"reports":true}');

    expect(isFeatureFlagEnabled(FeatureFlag.Reports)).toBe(true);
  });

  it('ignores an override that is not a boolean', () => {
    stored('{"reports":"yes"}');

    expect(isFeatureFlagEnabled(FeatureFlag.Reports)).toBe(false);
  });

  it('ignores a value that is not JSON', () => {
    stored('reports');

    expect(isFeatureFlagEnabled(FeatureFlag.Reports)).toBe(false);
  });
});
