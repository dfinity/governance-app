import type { AdvancedFeature } from './advancedFeatures';

/** A page that returning users get a modal for, one time. */
export enum PageAnnouncement {
  Reports = 'reports',
}

export type AnnouncementKey = AdvancedFeature | PageAnnouncement;
