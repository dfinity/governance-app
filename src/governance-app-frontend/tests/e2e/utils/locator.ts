import { Locator } from '@playwright/test';

// Pick whichever is visible first or -1 after 30 seconds
export const firstVisibleLocatorIndex = (locators: Locator[]): Promise<number> =>
  Promise.race(
    locators.map((locator, index) =>
      locator.waitFor({ state: 'visible', timeout: 30000 }).then(() => index),
    ),
  ).catch(() => -1);
