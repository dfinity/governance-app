import { useInternetIdentity } from 'ic-use-internet-identity';
import { useCallback } from 'react';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

export const useLogout = () => {
  const { clear } = useInternetIdentity();

  return useCallback(() => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  }, [clear]);
};
