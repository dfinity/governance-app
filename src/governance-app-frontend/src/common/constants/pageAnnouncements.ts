import { FileSpreadsheet, type LucideIcon } from 'lucide-react';

import { PageAnnouncement } from '@typings/featureAnnouncements';

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
    isEnabled: () => true,
  },
];

export const getEnabledPageAnnouncements = (): PageAnnouncementDefinition[] =>
  PAGE_ANNOUNCEMENTS.filter(({ isEnabled }) => isEnabled());
