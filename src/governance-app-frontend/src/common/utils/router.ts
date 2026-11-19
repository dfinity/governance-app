import { AnyRouter, ParsedLocation, redirect } from '@tanstack/react-router';

import {
  consumeLogoutRedirect,
  ensureInitialized,
  hasStoredSession,
} from '@common/auth/internetIdentity';

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
  const identity = await ensureInitialized();

  if (!identity) {
    console.log('[🔐 Protected Route]: identity not found, redirecting to login page.');

    const isManualLogout = consumeLogoutRedirect();

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

// The login page sends a visitor with a session to its redirect target, or to the dashboard.
const sessionDestination = ({ pathname, search }: ParsedLocation<{ redirect?: unknown }>) => {
  if (pathname !== '/') return pathname;

  return isSafeInternalRedirect(search.redirect) ? search.redirect.split(/[?#]/)[0] : '/dashboard';
};

/**
 * Starts the route code for a visitor with a stored session, so it downloads during the session
 * read. It fetches no data: the loaders still run after the route guards.
 */
export const preloadSessionRouteChunks = (router: AnyRouter) => {
  if (!hasStoredSession()) return;

  const [routes] = router.getMatchedRoutes(sessionDestination(router.latestLocation));

  routes.forEach((route) => void router.loadRouteChunk(route));
};
