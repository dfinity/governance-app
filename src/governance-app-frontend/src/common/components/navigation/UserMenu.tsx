import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CircleUser, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
import { Theme } from '@constants/theme';
import { useLogout } from '@hooks/useLogout';
import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';
import { useTheme } from '@hooks/useTheme';
import { getSessionTimeLeftForUi } from '@utils/date';

const PRINCIPAL_TRUNCATE_LENGTH = 5;

const truncatePrincipal = (principal: string) => {
  if (principal.length <= PRINCIPAL_TRUNCATE_LENGTH * 2 + 3) return principal;
  return `${principal.slice(0, PRINCIPAL_TRUNCATE_LENGTH)}...${principal.slice(-PRINCIPAL_TRUNCATE_LENGTH)}`;
};

type Props = {
  compact?: boolean;
};

export const UserMenu = ({ compact = false }: Props) => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const timeLeft = useSessionTimeLeft();
  const { resolvedTheme, setTheme } = useTheme();
  const logout = useLogout();

  const isDark = resolvedTheme === Theme.Dark;

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTheme(isDark ? Theme.Light : Theme.Dark);
  };

  const principal = identity?.getPrincipal().toText();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
            data-testid="user-menu-trigger"
          >
            <CircleUser className="size-5" />
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
            data-testid="user-menu-trigger"
          >
            <CircleUser className="size-5 shrink-0 text-muted-foreground" />
            {nonNullish(principal) && (
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {truncatePrincipal(principal)}
              </p>
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? 'end' : 'start'}
        side={compact ? 'bottom' : 'top'}
        className="w-56"
      >
        {nonNullish(timeLeft) && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t(($) => $.userAccount.session.timeLeft, getSessionTimeLeftForUi(timeLeft))}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings />
            {t(($) => $.common.settings)}
          </Link>
        </DropdownMenuItem>
        {/* preventDefault on onSelect keeps the dropdown open after toggling */}
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={handleThemeToggle}>
          {isDark ? <Sun /> : <Moon />}
          {isDark ? t(($) => $.userAccount.modes.light) : t(($) => $.userAccount.modes.dark)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout} data-testid="user-menu-logout">
          <LogOut />
          {t(($) => $.common.logout)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
