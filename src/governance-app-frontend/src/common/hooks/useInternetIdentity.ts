import { useSyncExternalStore } from 'react';

import { getAuthState, login, logout, subscribeAuthState } from '@common/auth/internetIdentity';

export const useInternetIdentity = () => {
  const { status, identity, sessionEndsAtMs, sessionEnd, iiAnswered } = useSyncExternalStore(
    subscribeAuthState,
    getAuthState,
  );

  return {
    identity,
    sessionEndsAtMs,
    sessionEnd,
    canLogin: status === 'idle',
    isLoggingIn: status === 'logging-in',
    isFinishingLogin: status === 'logging-in' && iiAnswered === true,
    login,
    logout,
  };
};
