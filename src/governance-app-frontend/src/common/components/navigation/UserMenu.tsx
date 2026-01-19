import { useInternetIdentity } from 'ic-use-internet-identity';
import { Headset, LogOut, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback } from '@components/Avatar';
import { Button } from '@components/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@components/Drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
import { Separator } from '@components/Separator';
import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { useMediaQuery } from '@hooks/useMediaQuery';

const truncatePrincipal = (principal: string) => {
  if (principal.length <= 10) return principal;
  return `${principal.slice(0, 4)}-...-${principal.slice(-3)}`;
};

interface AccountInfoProps {
  principal: string;
  isDrawer?: boolean;
}

const AccountInfo = ({ principal, isDrawer = false }: AccountInfoProps) => {
  const { t } = useTranslation();

  return (
    <div className={isDrawer ? 'flex items-center gap-4 py-4' : 'flex items-center gap-3 px-2 py-3'}>
      <Avatar className={isDrawer ? 'size-12 border' : 'size-10 border'}>
        <AvatarFallback className="bg-accent">
          <User
            className={isDrawer ? 'size-7 text-muted-foreground' : 'size-6 text-muted-foreground'}
          />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{t(($) => $.accountSettings.principalId)}</span>
        <span className="text-xs text-muted-foreground truncate font-mono">
          {truncatePrincipal(principal)}
        </span>
      </div>
    </div>
  );
};

export const UserMenu = () => {
  const { t } = useTranslation();
  const { identity, clear } = useInternetIdentity();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const principal = identity?.getPrincipal().toText();

  const handleLogout = useCallback(() => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  }, [clear]);

  if (!identity || !principal) return null;

  const trigger = (
    <Button
      variant="ghost"
      className="h-full w-14 rounded-none px-0"
      aria-label={t(($) => $.accountSettings.account)}
    >
      <Avatar className="size-8">
        <AvatarFallback className="bg-transparent">
          <User className="size-5" />
        </AvatarFallback>
      </Avatar>
    </Button>
  );

  return (
    <>
      {isDesktop ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            <AccountInfo principal={principal} />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <a href="https://support.dfinity.org" target="_blank" rel="noopener noreferrer">
                <Headset className="mr-2 size-4" />
                <span>{t(($) => $.common.support)}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
            >
              <LogOut className="mr-2 size-4 text-destructive" />
              <span>{t(($) => $.common.logout)}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Drawer>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t(($) => $.accountSettings.account)}</DrawerTitle>
          </DrawerHeader>
            <div className="flex flex-col gap-2 px-4 pb-8">
              <AccountInfo principal={principal} isDrawer />
              <div className="flex flex-col gap-2">
                <Button variant="ghost" className="justify-start h-12 px-4 w-full" asChild>
                  <a href="https://support.dfinity.org" target="_blank" rel="noopener noreferrer">
                    <Headset className="mr-3 size-5" />
                    <span>{t(($) => $.common.support)}</span>
                  </a>
                </Button>
                <Separator className="my-1" />
                <Button
                  variant="outline"
                  className="justify-start h-12 px-4 border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 size-5 text-destructive" />
                  <span>{t(($) => $.common.logout)}</span>
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};
