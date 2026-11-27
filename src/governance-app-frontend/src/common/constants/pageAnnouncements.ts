import { FileSpreadsheet, type LucideIcon } from 'lucide-react';

import { FeatureFlag } from '@constants/featureFlags';
import { PageAnnouncement } from '@typings/featureAnnouncements';
import { isFeatureFlagEnabled } from '@utils/featureFlags';

type PageAnnouncementDefinition = {
  key: PageAnnouncement;
  icon: LucideIcon;
  to: '/reports';
  /** While false, the page is not available and the modal waits. */
  isEnabled: () => boolean;
};

export const PAGE_ANNOUNCEMENTS: PageAnnouncementDefinition[] = [
  {
    key: PageAnnouncement.Reports,
    icon: FileSpreadsheet,
    to: '/reports',
    isEnabled: () => isFeatureFlagEnabled(FeatureFlag.Reports),
  },
];

export const getEnabledPageAnnouncements = (): PageAnnouncementDefinition[] =>
  PAGE_ANNOUNCEMENTS.filter(({ isEnabled }) => isEnabled());
