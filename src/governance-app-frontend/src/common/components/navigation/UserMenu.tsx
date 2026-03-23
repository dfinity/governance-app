import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { Copy, EllipsisVertical, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
            aria-label={t(($) => $.userAccount.aria.userMenu)}
            data-testid="user-menu-trigger"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Copy />
              My addresses
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout} data-testid="user-menu-logout">
            <LogOut />
            {t(($) => $.common.logout)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
