import { isNullish } from '@dfinity/utils';

import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAGS_STORAGE_KEY,
  type FeatureFlag,
} from '@constants/featureFlags';
import { getStorageItem } from '@utils/storage';

const readOverrides = (): Partial<Record<FeatureFlag, unknown>> => {
  const stored = getStorageItem(FEATURE_FLAGS_STORAGE_KEY);
  if (isNullish(stored)) return {};

  try {
    const parsed: unknown = JSON.parse(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

/** The stored override when it is a boolean, else the default of the flag. */
export const isFeatureFlagEnabled = (flag: FeatureFlag): boolean => {
  const override = readOverrides()[flag];

  return typeof override === 'boolean' ? override : FEATURE_FLAG_DEFAULTS[flag];
};
