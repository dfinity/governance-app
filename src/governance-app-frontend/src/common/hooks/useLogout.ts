import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { useInternetIdentity } from '@hooks/useInternetIdentity';

export const useLogout = () => {
  const { logout } = useInternetIdentity();

  return () => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    logout();
  };
};
