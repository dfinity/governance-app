import { useSyncExternalStore } from 'react';

import { getAuthState, login, logout, subscribeAuthState } from '@common/auth/internetIdentity';

export const useInternetIdentity = () => {
  const { status, identity } = useSyncExternalStore(subscribeAuthState, getAuthState);

  return { identity, isLoggingIn: status === 'logging-in', login, logout };
};
