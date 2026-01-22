import { ERROR_USER_INTERRUPT } from '@icp-sdk/auth/client';
import { ParsedLocation, redirect } from '@tanstack/react-router';
import { ensureInitialized } from 'ic-use-internet-identity';

import i18n from '@/i18n/config';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

import { warningNotification } from './notification';

export const requireIdentity = async ({ location }: { location: ParsedLocation }) => {
  try {
    const identity = await ensureInitialized();

    if (!identity) {
      console.log('[🔐 Protected Route]: identity not found, redirecting to login page.');

      // Don't show warning if user intentionally logged out
      const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';

      if (!isManualLogout) {
        warningNotification({
          title: i18n.t(($) => $.common.restricted),
          description: i18n.t(($) => $.common.restrictedPage),
        });
      }

      const redirectTo = location.pathname !== '/' ? location.pathname : undefined;
      throw redirect({ to: '/', search: { redirect: redirectTo } });
    }
  } catch (err) {
    // If user interrupts the login flow by closing the InternetIdentiy page, we just swallow the error (the user is just not authenticated, it is not an error in our app)
    if (!(err instanceof Error && err.message === ERROR_USER_INTERRUPT)) throw err;
  }
};
