import { redirect } from '@tanstack/react-router';
import { ensureInitialized } from 'ic-use-internet-identity';

import i18n from '@/i18n/config';

import { warningNotification } from './notification';

export const requireIdentity = async () => {
  const identity = await ensureInitialized();

  if (!identity) {
    console.log('[🔐 Protected Route]: identity not found, redirecting to homepage.');
    warningNotification({
      title: i18n.t(($) => $.common.restricted),
      description: i18n.t(($) => $.common.restrictedPage),
    });
    throw redirect({ to: '/' });
  }

  console.log('[🔐 Protected Route]: identity found, loading protected page.');
};
