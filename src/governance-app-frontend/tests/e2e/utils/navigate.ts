import { Page } from '@playwright/test';

const NAV_LABELS = {
  dashboard: 'Dashboard',
  neurons: 'Voting neurons',
  voting: 'Vote for proposals',
  settings: 'Settings',
} as const;

type NavPage = keyof typeof NAV_LABELS;

export const navigateTo = (page: Page, target: NavPage) =>
  page.getByRole('link', { name: NAV_LABELS[target], exact: true }).click();
