import { ERROR_USER_INTERRUPT } from '@icp-sdk/auth/client';
import { ParsedLocation, redirect } from '@tanstack/react-router';
import { ensureInitialized } from 'ic-use-internet-identity';

import i18n from '@/i18n/config';

import { warningNotification } from './notification';

export const requireIdentity = async ({ location }: { location: ParsedLocation }) => {
  let identity;

  try {
    identity = await ensureInitialized();
  } catch (err) {
    // If user interrupts the login flow by closing the InternetIdentiy page, we just swallow the error (the user is just not authenticated, it is not an error in our app)
    if (!(err instanceof Error && err.message === ERROR_USER_INTERRUPT)) throw err;
  }

  if (!identity) {
    console.log('[🔐 Protected Route]: identity not found, redirecting to login page.');
    warningNotification({
      title: i18n.t(($) => $.common.restricted),
      description: i18n.t(($) => $.common.restrictedPage),
    });

    const redirectTo = location.pathname !== '/' ? location.pathname : undefined;
    throw redirect({ to: '/', search: { redirect: redirectTo } });
  }
};
