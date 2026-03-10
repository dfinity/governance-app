import { useSyncExternalStore } from 'react';

import { ADVANCED_FEATURES_STORAGE_KEY } from '@constants/extra';
import {
  ADVANCED_FEATURES_DEFAULTS,
  type AdvancedFeaturesSettings,
} from '@typings/advancedFeatures';

const readFromStorage = (): AdvancedFeaturesSettings => {
  try {
    const savedKeys = localStorage.getItem(ADVANCED_FEATURES_STORAGE_KEY);
    if (!savedKeys) return { ...ADVANCED_FEATURES_DEFAULTS };
    return { ...ADVANCED_FEATURES_DEFAULTS, ...JSON.parse(savedKeys) };
  } catch {
    return { ...ADVANCED_FEATURES_DEFAULTS };
  }
};

const computeMissingKeys = (): Array<keyof AdvancedFeaturesSettings> => {
  const defaultKeys = Object.keys(ADVANCED_FEATURES_DEFAULTS) as Array<
    keyof AdvancedFeaturesSettings
  >;

  try {
    const savedKeys = localStorage.getItem(ADVANCED_FEATURES_STORAGE_KEY);
    if (!savedKeys) return defaultKeys;
    const stored = JSON.parse(savedKeys) as Partial<AdvancedFeaturesSettings>;
    return defaultKeys.filter((key) => !(key in stored));
  } catch {
    return defaultKeys;
  }
};

// Cached snapshots for referential stability (required by useSyncExternalStore).
let featuresSnapshot = readFromStorage();
let missingKeysSnapshot = computeMissingKeys();

function refreshSnapshots() {
  featuresSnapshot = readFromStorage();
  missingKeysSnapshot = computeMissingKeys();
}

let listeners: Array<() => void> = [];

const onStorage = (e: StorageEvent) => {
  if (e.key === ADVANCED_FEATURES_STORAGE_KEY) {
    refreshSnapshots();
    listeners.forEach((l) => l());
  }
};

const subscribe = (listener: () => void) => {
  const isFirst = listeners.length === 0;
  listeners = [...listeners, listener];
  if (isFirst) window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0) window.removeEventListener('storage', onStorage);
  };
};

const storeFeatures = (settings: AdvancedFeaturesSettings): void => {
  localStorage.setItem(ADVANCED_FEATURES_STORAGE_KEY, JSON.stringify(settings));
  refreshSnapshots();
  listeners.forEach((l) => l());
};

const setFeature = <K extends keyof AdvancedFeaturesSettings>(
  key: K,
  value: AdvancedFeaturesSettings[K],
): void => {
  storeFeatures({ ...featuresSnapshot, [key]: value });
};

/**
 * Hook to manage advanced feature flags with localStorage persistence.
 * Uses useSyncExternalStore for cross-component and cross-tab reactivity.
 */
export const useAdvancedFeatures = () => {
  const features = useSyncExternalStore(subscribe, () => featuresSnapshot);
  const missingFeatureKeys = useSyncExternalStore(subscribe, () => missingKeysSnapshot);

  return { features, setFeature, missingFeatureKeys };
};
