import { useNavigate } from '@tanstack/react-router';
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@components/Command';
import { getNavigationItems } from '@components/navigation/NavigationItems';
import { Theme } from '@constants/theme';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useCommandPaletteShortcut } from '@hooks/useCommandPaletteShortcut';
import { useHideBalances } from '@hooks/useHideBalances';
import { useLogout } from '@hooks/useLogout';
import { useTheme } from '@hooks/useTheme';
import { stringToBigInt } from '@utils/bigInt';

export const CommandPalette = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { hidden, setHidden } = useHideBalances();
  const { features } = useAdvancedFeatures();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);
  useCommandPaletteShortcut(toggleOpen);

  const runAndClose = (fn: () => void) => {
    fn();
    setOpen(false);
    setSearch('');
  };

  const navigationItems = getNavigationItems({ subaccountsEnabled: features.subaccounts });

  const trimmedSearch = search.trim();
  const proposalIdMatch = /^\d+$/.test(trimmedSearch) ? stringToBigInt(trimmedSearch) : undefined;
  const goToProposal = (id: bigint) => {
    runAndClose(() => navigate({ to: '/voting/proposals/$id', params: { id } }));
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t(($) => $.commandPalette.title)}
      description={t(($) => $.commandPalette.description)}
      showCloseButton={false}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={t(($) => $.commandPalette.placeholder)}
      />
      <CommandList>
        <CommandEmpty>{t(($) => $.commandPalette.empty)}</CommandEmpty>

        {proposalIdMatch !== undefined && (
          <CommandGroup heading={t(($) => $.commandPalette.groups.proposals)}>
            <CommandItem value={trimmedSearch} onSelect={() => goToProposal(proposalIdMatch)}>
              <FileTextIcon />
              <span>
                {t(($) => $.commandPalette.items.goToProposal, {
                  id: proposalIdMatch.toString(),
                })}
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading={t(($) => $.commandPalette.groups.navigate)}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runAndClose(() => navigate({ to: item.href }))}
            >
              <item.icon />
              <span>{t(item.label as never)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t(($) => $.commandPalette.groups.preferences)}>
          <CommandItem onSelect={() => setTheme(Theme.Light)}>
            <SunIcon />
            <span>{t(($) => $.commandPalette.items.themeLight)}</span>
            {theme === Theme.Light && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem onSelect={() => setTheme(Theme.Dark)}>
            <MoonIcon />
            <span>{t(($) => $.commandPalette.items.themeDark)}</span>
            {theme === Theme.Dark && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem onSelect={() => setTheme(Theme.System)}>
            <MonitorIcon />
            <span>{t(($) => $.commandPalette.items.themeSystem)}</span>
            {theme === Theme.System && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setHidden(!hidden))}>
            {hidden ? <EyeIcon /> : <EyeOffIcon />}
            <span>
              {hidden
                ? t(($) => $.commandPalette.items.showBalances)
                : t(($) => $.commandPalette.items.hideBalances)}
            </span>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(logout)}>
            <LogOutIcon />
            <span>{t(($) => $.commandPalette.items.signOut)}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
