import { redirect } from '@tanstack/react-router';
import { ensureInitialized } from 'ic-use-internet-identity';

export const requireIdentity = async () => {
  const identity = await ensureInitialized();

  if (!identity) {
    console.log('[🔐 Protected Route]: identity not found, redirecting to homepage.');
    throw redirect({ to: '/' });
  }

  console.log('[🔐 Protected Route]: identity found, loading protected page.');
};
