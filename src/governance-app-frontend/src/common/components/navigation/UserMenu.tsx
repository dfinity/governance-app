import { nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLogout } from '@hooks/useLogout';
import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';

const PRINCIPAL_TRUNCATE_LENGTH = 5;

const truncatePrincipal = (principal: string) => {
  if (principal.length <= PRINCIPAL_TRUNCATE_LENGTH * 2 + 3) return principal;
  return `${principal.slice(0, PRINCIPAL_TRUNCATE_LENGTH)}...${principal.slice(-PRINCIPAL_TRUNCATE_LENGTH)}`;
};

export const UserMenu = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const timeLeft = useSessionTimeLeft();
  const logout = useLogout();

  const principal = identity?.getPrincipal().toText();

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        {nonNullish(principal) && (
          <p className="truncate text-sm font-medium">{truncatePrincipal(principal)}</p>
        )}
        {nonNullish(timeLeft) && (
          <p className="text-xs text-muted-foreground">
            {t(($) => $.userAccount.session.timeLeftShort, { minutes: timeLeft.minutes })}
          </p>
        )}
      </div>
      <button
        onClick={logout}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t(($) => $.common.logout)}
        title={t(($) => $.common.logout)}
        data-testid="user-menu-logout"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
};
