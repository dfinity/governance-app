import { useInternetIdentity } from 'ic-use-internet-identity';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

export const useLogout = () => {
  const { clear } = useInternetIdentity();

  return () => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  };
};
