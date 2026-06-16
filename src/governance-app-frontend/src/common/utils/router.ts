import { ERROR_USER_INTERRUPT } from '@icp-sdk/auth/client';
import { ParsedLocation, redirect } from '@tanstack/react-router';
import { ensureInitialized } from 'ic-use-internet-identity';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

import i18n from '@/i18n/config';

import { warningNotification } from './notification';

/**
 * Returns true only for values safe to use as a post-login redirect destination:
 * a same-origin, absolute internal path. Rejects absolute URLs, protocol-relative
 * (`//host`) and backslash (`/\host`) bypasses that browsers can treat as cross-origin.
 *
 * TanStack's `redirect({ to })` path-normalizes hostile values today, but validating
 * here keeps the guarantee independent of router internals and guards against a future
 * switch to `href` (which does navigate cross-origin).
 */
export const isSafeInternalRedirect = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.startsWith('/\\');

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

    const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';

    // If the user logs out, we don't want to save their last location
    // and don't show warning if user intentionally logged out
    if (isManualLogout) throw redirect({ to: '/' });

    warningNotification({
      title: i18n.t(($) => $.common.restricted),
      description: i18n.t(($) => $.common.restrictedPage),
    });

    throw redirect({ to: '/', search: { redirect: location.pathname } });
  }
};
