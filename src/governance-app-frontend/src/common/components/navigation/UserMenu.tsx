import { useInternetIdentity } from 'ic-use-internet-identity';
import { Copy, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@components/Avatar';
import { Button } from '@components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';

export const UserMenu = () => {
  const { identity, login, clear } = useInternetIdentity();
  const { t } = useTranslation();

  const handleCopyPrincipal = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.getPrincipal().toText());
      toast.success('Copied!');
    }
  };

  if (!identity) {
    return (
      <Button onClick={login} variant="outline" size="sm">
        {t(($) => $.common.login)}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt="User" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">User</p>
            <p className="truncate text-xs leading-none text-muted-foreground">
              {identity.getPrincipal().toText()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyPrincipal}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Principal ID</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={clear} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t(($) => $.common.logout)}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
