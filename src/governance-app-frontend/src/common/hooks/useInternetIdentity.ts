import { useSyncExternalStore } from 'react';

import { getAuthState, login, logout, subscribeAuthState } from '@common/auth/internetIdentity';

export const useInternetIdentity = () => {
  const { status, identity, sessionEndsAtMs } = useSyncExternalStore(
    subscribeAuthState,
    getAuthState,
  );

  return { identity, sessionEndsAtMs, isLoggingIn: status === 'logging-in', login, logout };
};
