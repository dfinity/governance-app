import { isNullish, nonNullish } from '@dfinity/utils';
import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnalyticsProperties } from '@features/analytics/useAnalyticsProperties';
import { useLoginAnalytics } from '@features/analytics/useLoginAnalytics';
import { useSignedInProperty } from '@features/analytics/useSignedInProperty';
import { PendingDeviceActionDialog } from '@features/ledger/components/PendingDeviceActionDialog';
import { useClaimPendingDeviceStakes } from '@features/stakes/hooks/useClaimPendingDeviceStakes';

import { CommandPalette } from '@components/CommandPalette';
import { MainLayout } from '@components/MainLayout';
import { SessionCountdownToast } from '@components/SessionCountdownToast';
import { TransactionPollingWatcher } from '@components/TransactionPollingWatcher';
import { useHideBalancesShortcut } from '@hooks/useHideBalancesShortcut';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useLogoutShortcut } from '@hooks/useLogoutShortcut';
import { useNewFeatureCheck } from '@hooks/useNewFeatureCheck';
import { useScrollResetOnNavigation } from '@hooks/useScrollResetOnNavigation';
import { useSidebarShortcut } from '@hooks/useSidebarShortcut';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { isPublicPath } from '@utils/publicRoutes';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: requireIdentity,
  component: AuthLayout,
  head: () => {
    return {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    };
  },
});

function AuthLayout() {
  const { t } = useTranslation();
  const { identity, isLoggingIn, isLoggingOut } = useInternetIdentity();
  // The path of the rendered page. The location moves to a pending page before its guard runs.
  const pathname = useMatches({ select: (matches) => matches.at(-1)?.pathname ?? '' });

  // The page of a logout in this tab, which waits for the redirect to the login page. The logout
  // can end before the redirect, so the reader view must not show for that page in between.
  const [logoutPathname, setLogoutPathname] = useState<string>();
  if (isLoggingOut && logoutPathname !== pathname) setLogoutPathname(pathname);
  if (nonNullish(identity) && nonNullish(logoutPathname)) setLogoutPathname(undefined);

  useThemeShortcut();
  useScrollResetOnNavigation();
  // Before the tracker starts, so the first pageview has the property.
  useSignedInProperty();
  // Starts the tracker, and reports a login from a public page.
  useLoginAnalytics();

  // Guard against the brief re-render window between identity clearing (synchronous)
  // and route invalidation (async). Without this, child components could crash
  // accessing identity-derived data (e.g. accountId) before the router redirects.
  // A public page stays for a signed-out reader, but not after a logout in this tab, which goes
  // to the login page.
  const isLogoutPage = isLoggingOut || logoutPathname === pathname;
  if (isNullish(identity) && (isLogoutPage || !isPublicPath(pathname))) return null;

  const isReader = isNullish(identity);

  // The outlet keeps its place in both views, so a login does not remount the page.
  return (
    <MainLayout variant={isReader ? 'reader' : 'app'}>
      <Outlet />
      {isReader ? (
        <p role="status" className="sr-only">
          {isLoggingIn ? t(($) => $.reader.loginPending) : ''}
        </p>
      ) : (
        <SignedInLayout />
      )}
    </MainLayout>
  );
}

/** The hooks and the global UI that need a session. They start at a login on a public page. */
function SignedInLayout() {
  useLogoutShortcut();
  useHideBalancesShortcut();
  useSidebarShortcut();
  useNewFeatureCheck();
  useAnalyticsProperties();
  // A Ledger device stake that an earlier session signed and did not claim.
  useClaimPendingDeviceStakes();

  return (
    <>
      <CommandPalette />
      <SessionCountdownToast />
      <TransactionPollingWatcher />
      <PendingDeviceActionDialog />
    </>
  );
}
