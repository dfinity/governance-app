import { nonNullish } from '@dfinity/utils';
import { useNavigate } from '@tanstack/react-router';
import { useCommandState } from 'cmdk';
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  KeyboardIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { parseProposalId } from '@features/proposals/utils';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@components/Command';
import { Kbd } from '@components/Kbd';
import { getNavigationItems } from '@components/navigation/NavigationItems';
import { ADVANCED_FEATURES } from '@constants/advancedFeatures';
import { Theme } from '@constants/theme';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useCommandPaletteShortcut } from '@hooks/useCommandPaletteShortcut';
import { useHideBalances } from '@hooks/useHideBalances';
import { useLogout } from '@hooks/useLogout';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { notifyAdvancedFeatureChange } from '@utils/advancedFeatures';

const NAVIGATION_KEYWORDS: Record<string, string[]> = {
  '/dashboard': ['home', 'overview'],
  '/neurons': ['stake', 'stakes', 'staking'],
  '/voting': ['proposals', 'vote', 'governance'],
  '/accounts': ['wallet', 'balance', 'send', 'receive'],
  '/settings': ['preferences', 'config'],
};

const FEATURE_KEYWORDS: Record<AdvancedFeature, string[]> = {
  [AdvancedFeature.Subaccounts]: ['subaccounts', 'multiple accounts', 'wallets'],
  [AdvancedFeature.AdvancedFollowing]: ['follow', 'following', 'topics', 'neurons'],
  [AdvancedFeature.ShowNonConstructiveProposals]: [
    'show all proposals',
    'spam',
    'non-constructive',
  ],
  [AdvancedFeature.TransactionMemo]: ['memo', 'send', 'transaction'],
};

const TOGGLE_BALANCES_VALUE = 'toggle-balances';
const TOGGLE_SHORTCUTS_VALUE = 'toggle-shortcuts';
const SIGN_OUT_VALUE = 'signout';
const navValue = (href: string) => `nav:${href}`;
const themeValue = (theme: Theme) => `theme:${theme}`;
const featureValue = (feature: AdvancedFeature) => `feature:${feature}`;

type HintKey =
  | 'goToPage'
  | 'openProposal'
  | 'applyTheme'
  | 'toggleBalances'
  | 'toggleShortcuts'
  | 'toggleFeature'
  | 'signOut';

const getHintKey = (value: unknown): HintKey | null => {
  if (typeof value !== 'string' || value === '') return null;
  if (value.startsWith('nav:')) return 'goToPage';
  if (value.startsWith('theme:')) return 'applyTheme';
  if (value.startsWith('feature:')) return 'toggleFeature';
  if (value === TOGGLE_BALANCES_VALUE) return 'toggleBalances';
  if (value === TOGGLE_SHORTCUTS_VALUE) return 'toggleShortcuts';
  if (value === SIGN_OUT_VALUE) return 'signOut';
  if (/^\d+$/.test(value)) return 'openProposal';
  return null;
};

const CommandHintFooter = () => {
  const { t } = useTranslation();
  const value = useCommandState((state) => state.value);
  const hintKey = getHintKey(value);
  if (!hintKey) return null;

  return (
    <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
      <Kbd>↵</Kbd>
      <span>{t(($) => $.commandPalette.hints[hintKey])}</span>
    </div>
  );
};

export const CommandPalette = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { hidden, setHidden } = useHideBalances();
  const { enabled: shortcutsEnabled, setEnabled: setShortcutsEnabled } = useShortcutSettings();
  const { features, setFeature } = useAdvancedFeatures();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setSearch('');
    setOpen(next);
  };

  useCommandPaletteShortcut(() => handleOpenChange(!open));

  const runAndClose = (fn: () => void) => {
    fn();
    handleOpenChange(false);
  };

  const navigationItems = getNavigationItems({ subaccountsEnabled: features.subaccounts });

  const trimmedSearch = search.trim();
  const proposalIdMatch = parseProposalId(trimmedSearch);
  const showProposalHint = trimmedSearch === '';
  const goToProposal = (id: bigint) => {
    runAndClose(() => navigate({ to: '/voting/proposals/$id', params: { id } }));
  };

  const toggleFeature = (key: AdvancedFeature) => {
    const next = !features[key];
    runAndClose(() => {
      setFeature(key, next);
      notifyAdvancedFeatureChange(t, key, next);
    });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
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

        <CommandGroup heading={t(($) => $.commandPalette.groups.navigate)}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={navValue(item.href)}
              keywords={NAVIGATION_KEYWORDS[item.href]}
              onSelect={() => runAndClose(() => navigate({ to: item.href }))}
            >
              <item.icon />
              <span>{t(item.label as never)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {(showProposalHint || nonNullish(proposalIdMatch)) && (
          <CommandGroup heading={t(($) => $.commandPalette.groups.proposals)}>
            {nonNullish(proposalIdMatch) ? (
              <CommandItem value={trimmedSearch} onSelect={() => goToProposal(proposalIdMatch)}>
                <FileTextIcon />
                <span>
                  {t(($) => $.commandPalette.items.goToProposal, {
                    id: proposalIdMatch.toString(),
                  })}
                </span>
              </CommandItem>
            ) : (
              <CommandItem value="proposal-hint" disabled>
                <FileTextIcon />
                <span>{t(($) => $.commandPalette.items.proposalHint)}</span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading={t(($) => $.commandPalette.groups.preferences)}>
          <CommandItem
            value={themeValue(Theme.Light)}
            keywords={['appearance', 'color']}
            onSelect={() => setTheme(Theme.Light)}
          >
            <SunIcon />
            <span>{t(($) => $.commandPalette.items.themeLight)}</span>
            {theme === Theme.Light && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem
            value={themeValue(Theme.Dark)}
            keywords={['appearance', 'color']}
            onSelect={() => setTheme(Theme.Dark)}
          >
            <MoonIcon />
            <span>{t(($) => $.commandPalette.items.themeDark)}</span>
            {theme === Theme.Dark && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem
            value={themeValue(Theme.System)}
            keywords={['appearance', 'color']}
            onSelect={() => setTheme(Theme.System)}
          >
            <MonitorIcon />
            <span>{t(($) => $.commandPalette.items.themeSystem)}</span>
            {theme === Theme.System && <CheckIcon className="ml-auto" />}
          </CommandItem>
          <CommandItem
            value={TOGGLE_BALANCES_VALUE}
            keywords={['privacy', 'balance']}
            onSelect={() => runAndClose(() => setHidden(!hidden))}
          >
            {hidden ? <EyeIcon /> : <EyeOffIcon />}
            <span>
              {hidden
                ? t(($) => $.commandPalette.items.showBalances)
                : t(($) => $.commandPalette.items.hideBalances)}
            </span>
          </CommandItem>
          {/* Stays open: the checkmark is the only feedback this toggle gives. */}
          <CommandItem
            value={TOGGLE_SHORTCUTS_VALUE}
            keywords={['keyboard', 'shortcuts', 'hotkeys', 'keys']}
            onSelect={() => setShortcutsEnabled(!shortcutsEnabled)}
          >
            <KeyboardIcon />
            <span>{t(($) => $.commandPalette.items.keyboardShortcuts)}</span>
            {shortcutsEnabled && <CheckIcon className="ml-auto" />}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading={t(($) => $.commandPalette.groups.advancedFeatures)}>
          {ADVANCED_FEATURES.map(({ key, icon: Icon }) => (
            <CommandItem
              key={key}
              value={featureValue(key)}
              keywords={FEATURE_KEYWORDS[key]}
              onSelect={() => toggleFeature(key)}
            >
              <Icon />
              <span>{t(($) => $.userAccount.advancedFeatures.items[key].label)}</span>
              {features[key] && <CheckIcon className="ml-auto" />}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup>
          <CommandItem
            value={SIGN_OUT_VALUE}
            keywords={['logout', 'log out']}
            onSelect={() => runAndClose(logout)}
          >
            <LogOutIcon />
            <span>{t(($) => $.commandPalette.items.signOut)}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <CommandHintFooter />
    </CommandDialog>
  );
};
