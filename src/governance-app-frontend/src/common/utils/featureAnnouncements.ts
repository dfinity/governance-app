import { ADVANCED_FEATURES, getAnnouncedFeatures } from '@constants/advancedFeatures';
import { SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY } from '@constants/extra';
import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';
import { getStorageItem, setStorageItem } from '@utils/storage';

const isAdvancedFeature = (value: unknown): value is AdvancedFeature =>
  Object.values<unknown>(AdvancedFeature).includes(value);

/** The features whose modal the user saw in this browser. */
export const getSeenAnnouncements = (): AdvancedFeature[] => {
  try {
    const stored: unknown = JSON.parse(
      getStorageItem(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(stored) ? stored.filter(isAdvancedFeature) : [];
  } catch {
    return [];
  }
};

export const markAnnouncementsSeen = (keys: AdvancedFeature[]): void => {
  const seen = new Set([...getSeenAnnouncements(), ...keys]);
  setStorageItem(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify([...seen]));
};

/** Marks each feature with a modal as seen, so a new user does not get them after the welcome. */
export const markAllAnnouncementsSeen = (): void =>
  markAnnouncementsSeen(ADVANCED_FEATURES.filter(({ announce }) => announce).map(({ key }) => key));

/** Whether the feature has a modal in this browser, so the modal and not a toast presents it. */
export const isAnnouncedFeature = (key: AdvancedFeature): boolean =>
  getAnnouncedFeatures().some((feature) => feature.key === key);

/** The features with a modal that the user did not see, in display order. */
export const getUnseenAnnouncements = (): AdvancedFeature[] => {
  const seen = getSeenAnnouncements();
  return getAnnouncedFeatures()
    .map(({ key }) => key)
    .filter((key) => !seen.includes(key));
};

/** The unseen features that the user still has off. A feature that is on needs no modal. */
export const splitUnseenAnnouncements = (
  features: AdvancedFeaturesSettings,
): { toShow: AdvancedFeature[]; alreadyOn: AdvancedFeature[] } => {
  const unseen = getUnseenAnnouncements();
  return {
    toShow: unseen.filter((key) => !features[key]),
    alreadyOn: unseen.filter((key) => features[key]),
  };
};
