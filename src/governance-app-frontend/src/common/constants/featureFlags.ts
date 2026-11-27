/**
 * Flags for features that are not released yet. A flag hides the feature from all users.
 * The Settings page does not list these flags, unlike the advanced features.
 */
export enum FeatureFlag {}

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {};

/**
 * The `localStorage` key of the overrides, for tests before the release. For example:
 * `localStorage.setItem('nns-feature-flags', '{"myFeature":true}')`.
 */
export const FEATURE_FLAGS_STORAGE_KEY = 'nns-feature-flags';
