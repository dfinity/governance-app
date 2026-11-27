import { ADVANCED_FEATURES, getAnnouncedFeatures } from '@constants/advancedFeatures';
import { SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY } from '@constants/extra';
import { getEnabledPageAnnouncements } from '@constants/pageAnnouncements';
import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';
import { type AnnouncementKey, PageAnnouncement } from '@typings/featureAnnouncements';
import { getStorageItem, setStorageItem } from '@utils/storage';

export const isAdvancedFeature = (value: unknown): value is AdvancedFeature =>
  Object.values<unknown>(AdvancedFeature).includes(value);

const isAnnouncementKey = (value: unknown): value is AnnouncementKey =>
  isAdvancedFeature(value) || Object.values<unknown>(PageAnnouncement).includes(value);

/** The features and pages whose modal the user saw in this browser. */
export const getSeenAnnouncements = (): AnnouncementKey[] => {
  try {
    const stored: unknown = JSON.parse(
      getStorageItem(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(stored) ? stored.filter(isAnnouncementKey) : [];
  } catch {
    return [];
  }
};

export const markAnnouncementsSeen = (keys: AnnouncementKey[]): void => {
  const seen = new Set([...getSeenAnnouncements(), ...keys]);
  setStorageItem(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify([...seen]));
};

/**
 * Marks each feature with a modal as seen, so a new user does not get them after the welcome.
 * A page that is not available yet stays unseen, so the user gets its modal when it is.
 */
export const markAllAnnouncementsSeen = (): void =>
  markAnnouncementsSeen([
    ...ADVANCED_FEATURES.filter(({ announce }) => announce).map(({ key }) => key),
    ...getEnabledPageAnnouncements().map(({ key }) => key),
  ]);

/** Whether the feature has a modal in this browser, so the modal and not a toast presents it. */
export const isAnnouncedFeature = (key: AdvancedFeature): boolean =>
  getAnnouncedFeatures().some((feature) => feature.key === key);

/** The features and pages with a modal that the user did not see, in display order. */
export const getUnseenAnnouncements = (): AnnouncementKey[] => {
  const seen = getSeenAnnouncements();
  return [...getAnnouncedFeatures(), ...getEnabledPageAnnouncements()]
    .map(({ key }) => key)
    .filter((key) => !seen.includes(key));
};

/** The unseen announcements, without the features that are on. A feature that is on needs no modal. */
export const splitUnseenAnnouncements = (
  features: AdvancedFeaturesSettings,
): { toShow: AnnouncementKey[]; alreadyOn: AdvancedFeature[] } => {
  const unseen = getUnseenAnnouncements();
  return {
    toShow: unseen.filter((key) => !isAdvancedFeature(key) || !features[key]),
    alreadyOn: unseen.filter(isAdvancedFeature).filter((key) => features[key]),
  };
};
