import { nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLogout } from '@hooks/useLogout';
import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';
import { truncatePrincipal } from '@utils/principal';

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
        type="button"
        onClick={logout}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-destructive-foreground"
        aria-label={t(($) => $.common.logout)}
        title={t(($) => $.common.logout)}
        data-testid="user-menu-logout"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
};
