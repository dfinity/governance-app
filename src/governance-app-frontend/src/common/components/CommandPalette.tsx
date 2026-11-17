import { nonNullish } from '@dfinity/utils';
import { useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import {
  ArrowDownToLineIcon,
  BanknoteIcon,
  BookUserIcon,
  CalendarRangeIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  KeyboardIcon,
  LockIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
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
import { CommandPaletteNoResultTracker } from '@components/CommandPaletteNoResultTracker';
import { Kbd } from '@components/Kbd';
import { getNavigationItems } from '@components/navigation/NavigationItems';
import { getSupportedAdvancedFeatures } from '@constants/advancedFeatures';
import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { Theme } from '@constants/theme';
import { useGovernanceNeurons } from '@hooks/governance';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useCommandPaletteShortcut } from '@hooks/useCommandPaletteShortcut';
import { useFiatCurrency } from '@hooks/useFiatCurrency';
import { useForecastPeriod } from '@hooks/useForecastPeriod';
import { useHideBalances } from '@hooks/useHideBalances';
import { useLogout } from '@hooks/useLogout';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { isAccountsAreaEnabled, notifyAdvancedFeatureChange } from '@utils/advancedFeatures';
import { warningNotification } from '@utils/notification';

// We only support English for now.
const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });

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
  [AdvancedFeature.LedgerDevice]: ['ledger', 'hardware wallet', 'device', 'nano'],
};

enum Action {
  Receive = 'receive',
  Stake = 'stake',
  ManageFollowing = 'manageFollowing',
  AddressBook = 'addressBook',
}

const ACTION_KEYWORDS: Record<Action, string[]> = {
  [Action.Receive]: ['deposit', 'address', 'qr code', 'account id'],
  [Action.Stake]: ['neuron', 'staking', 'create neuron', 'wizard'],
  [Action.ManageFollowing]: ['follow', 'followees', 'vote', 'known neuron'],
  [Action.AddressBook]: ['contacts', 'addresses', 'saved addresses'],
};

// The cmdk filter also scores letters that are far apart, for example "euro" in "Show all proposals".
// Such matches score below 0.05. Word, prefix, and abbreviation matches score above 0.15.
const MIN_MATCH_SCORE = 0.1;

const filterCommands = (value: string, search: string, keywords?: string[]) => {
  const score = defaultFilter(value, search, keywords);
  return score >= MIN_MATCH_SCORE ? score : 0;
};

const TOGGLE_BALANCES_VALUE = 'toggle-balances';
const TOGGLE_SHORTCUTS_VALUE = 'toggle-shortcuts';
const SIGN_OUT_VALUE = 'signout';
const navValue = (href: string) => `nav:${href}`;
const themeValue = (theme: Theme) => `theme:${theme}`;
const featureValue = (feature: AdvancedFeature) => `feature:${feature}`;
const actionValue = (action: Action) => `action:${action}`;
const currencyValue = (currency: FiatCurrency) => `currency:${currency}`;
const forecastValue = (period: ForecastPeriod) => `forecast:${period}`;

type HintKey =
  | 'goToPage'
  | 'openProposal'
  | 'runAction'
  | 'setCurrency'
  | 'setForecastPeriod'
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
  if (value.startsWith('action:')) return 'runAction';
  if (value.startsWith('currency:')) return 'setCurrency';
  if (value.startsWith('forecast:')) return 'setForecastPeriod';
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

/**
 * cmdk ranks items inside a group, but it keeps the groups in DOM order. While the user searches,
 * the items render without groups, so the best match is first.
 */
const CommandSection = ({
  ranked,
  ...props
}: ComponentProps<typeof CommandGroup> & { ranked: boolean }) =>
  ranked ? props.children : <CommandGroup {...props} />;

/**
 * CommandItem that reports the selected item to analytics. A proposal ID is reported as
 * `proposal`.
 */
const TrackedCommandItem = ({ onSelect, ...props }: ComponentProps<typeof CommandItem>) => (
  <CommandItem
    {...props}
    onSelect={(value) => {
      analytics.event(AnalyticsEvent.CommandPaletteSelect, {
        item: /^\d+$/.test(value) ? 'proposal' : value,
      });
      onSelect?.(value);
    }}
  />
);

export const CommandPalette = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { hidden, setHidden } = useHideBalances();
  const { enabled: shortcutsEnabled, setEnabled: setShortcutsEnabled } = useShortcutSettings();
  const { features, setFeature } = useAdvancedFeatures();
  const { fiatCurrency, setFiatCurrency } = useFiatCurrency();
  const { forecastPeriod, setForecastPeriod } = useForecastPeriod();
  const neuronsQuery = useGovernanceNeurons();
  const logout = useLogout('command_palette');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (next && !open) analytics.event(AnalyticsEvent.CommandPaletteOpen);
    if (!next) setSearch('');
    setOpen(next);
  };

  useCommandPaletteShortcut(() => handleOpenChange(!open));

  const runAndClose = (fn: () => void) => {
    fn();
    handleOpenChange(false);
  };

  const navigationItems = getNavigationItems({ accountsEnabled: isAccountsAreaEnabled(features) });

  const trimmedSearch = search.trim();
  const proposalIdMatch = parseProposalId(trimmedSearch);
  const showProposalHint = trimmedSearch === '';
  const goToProposal = (id: bigint) => {
    runAndClose(() => navigate({ to: '/voting/proposals/$id', params: { id } }));
  };

  const userNeurons = neuronsQuery.data?.response;

  const actions: Array<{
    key: Action;
    icon: typeof LockIcon;
    label: string;
    disabled?: boolean;
    run: () => void;
  }> = [
    {
      key: Action.Receive,
      icon: ArrowDownToLineIcon,
      label: t(($) => $.commandPalette.items.receiveIcp),
      run: () => navigate({ to: '/dashboard', search: { depositModal: true } }),
    },
    {
      key: Action.Stake,
      icon: LockIcon,
      label: t(($) => $.commandPalette.items.stakeIcp),
      run: () => navigate({ to: '/neurons', search: { openWizard: true } }),
    },
    {
      key: Action.ManageFollowing,
      icon: UsersIcon,
      label: t(($) => $.commandPalette.items.manageFollowing),
      // The warning needs a loaded list of neurons.
      disabled: !userNeurons,
      run: () => {
        if (!userNeurons?.length) {
          warningNotification({ description: t(($) => $.voting.warnings.stakeRequired) });
          return;
        }
        navigate({ to: '/voting', search: { manageFollowing: true } });
      },
    },
    {
      key: Action.AddressBook,
      icon: BookUserIcon,
      label: t(($) => $.commandPalette.items.addressBook),
      run: () => navigate({ to: '/settings', search: { openAddressBook: true } }),
    },
  ];

  const forecastPeriodLabel = (period: ForecastPeriod) =>
    t(($) => $.commandPalette.items.forecastPeriod, {
      period: t(($) => $.userAccount.forecastPeriod.options[period]),
    });

  const changeForecastPeriod = (period: ForecastPeriod) => {
    setForecastPeriod(period);
    analytics.event(AnalyticsEvent.ForecastPeriodChange, { period, source: 'command_palette' });
  };

  const isSearching = trimmedSearch !== '';

  const toggleFeature = (key: AdvancedFeature) => {
    const next = !features[key];
    runAndClose(() => {
      setFeature(key, next);
      notifyAdvancedFeatureChange(t, key, next);
    });
  };

  const themeItems = [
    { theme: Theme.Light, icon: SunIcon, label: t(($) => $.commandPalette.items.themeLight) },
    { theme: Theme.Dark, icon: MoonIcon, label: t(($) => $.commandPalette.items.themeDark) },
    { theme: Theme.System, icon: MonitorIcon, label: t(($) => $.commandPalette.items.themeSystem) },
  ];
  const balancesLabel = hidden
    ? t(($) => $.commandPalette.items.showBalances)
    : t(($) => $.commandPalette.items.hideBalances);
  const shortcutsLabel = t(($) => $.commandPalette.items.keyboardShortcuts);
  const signOutLabel = t(($) => $.commandPalette.items.signOut);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t(($) => $.commandPalette.title)}
      description={t(($) => $.commandPalette.description)}
      showCloseButton={false}
      filter={filterCommands}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={t(($) => $.commandPalette.placeholder)}
      />
      <CommandList>
        <CommandEmpty>{t(($) => $.commandPalette.empty)}</CommandEmpty>

        <CommandSection ranked={isSearching} heading={t(($) => $.commandPalette.groups.navigate)}>
          {navigationItems.map((item) => {
            const label = t(item.label as never);
            return (
              <TrackedCommandItem
                key={item.href}
                value={navValue(item.href)}
                keywords={[label, ...(NAVIGATION_KEYWORDS[item.href] ?? [])]}
                onSelect={() => runAndClose(() => navigate({ to: item.href }))}
              >
                <item.icon />
                <span>{label}</span>
              </TrackedCommandItem>
            );
          })}
        </CommandSection>

        <CommandSection ranked={isSearching} heading={t(($) => $.commandPalette.groups.actions)}>
          {actions.map(({ key, icon: Icon, label, disabled, run }) => (
            <TrackedCommandItem
              key={key}
              value={actionValue(key)}
              keywords={[label, ...ACTION_KEYWORDS[key]]}
              disabled={disabled}
              onSelect={() => runAndClose(run)}
            >
              <Icon />
              <span>{label}</span>
            </TrackedCommandItem>
          ))}
        </CommandSection>

        {(showProposalHint || nonNullish(proposalIdMatch)) && (
          <CommandSection
            ranked={isSearching}
            heading={t(($) => $.commandPalette.groups.proposals)}
          >
            {nonNullish(proposalIdMatch) ? (
              <TrackedCommandItem
                value={trimmedSearch}
                onSelect={() => goToProposal(proposalIdMatch)}
              >
                <FileTextIcon />
                <span>
                  {t(($) => $.commandPalette.items.goToProposal, {
                    id: proposalIdMatch.toString(),
                  })}
                </span>
              </TrackedCommandItem>
            ) : (
              <TrackedCommandItem value="proposal-hint" disabled>
                <FileTextIcon />
                <span>{t(($) => $.commandPalette.items.proposalHint)}</span>
              </TrackedCommandItem>
            )}
          </CommandSection>
        )}

        {!isSearching && <CommandSeparator />}

        <CommandSection
          ranked={isSearching}
          heading={t(($) => $.commandPalette.groups.preferences)}
        >
          {themeItems.map(({ theme: itemTheme, icon: Icon, label }) => (
            <TrackedCommandItem
              key={itemTheme}
              value={themeValue(itemTheme)}
              keywords={[label, 'appearance', 'color']}
              onSelect={() => setTheme(itemTheme)}
            >
              <Icon />
              <span>{label}</span>
              {theme === itemTheme && <CheckIcon className="ml-auto" />}
            </TrackedCommandItem>
          ))}
          <TrackedCommandItem
            value={TOGGLE_BALANCES_VALUE}
            keywords={[balancesLabel, 'privacy', 'balance']}
            onSelect={() => runAndClose(() => setHidden(!hidden))}
          >
            {hidden ? <EyeIcon /> : <EyeOffIcon />}
            <span>{balancesLabel}</span>
          </TrackedCommandItem>
          {/* Stays open: the checkmark is the only feedback this toggle gives. */}
          <TrackedCommandItem
            value={TOGGLE_SHORTCUTS_VALUE}
            keywords={[shortcutsLabel, 'keyboard', 'shortcuts', 'hotkeys', 'keys']}
            onSelect={() => setShortcutsEnabled(!shortcutsEnabled)}
          >
            <KeyboardIcon />
            <span>{shortcutsLabel}</span>
            {shortcutsEnabled && <CheckIcon className="ml-auto" />}
          </TrackedCommandItem>
          {/* The options are long lists, so they show only when the user searches. */}
          {isSearching &&
            Object.values(FiatCurrency).map((currency) => {
              const label = t(($) => $.commandPalette.items.fiatCurrency, {
                name: currencyNames.of(currency),
                code: currency,
              });
              return (
                <TrackedCommandItem
                  key={currency}
                  value={currencyValue(currency)}
                  keywords={[label, 'currency', 'fiat', 'money']}
                  onSelect={() => setFiatCurrency(currency)}
                >
                  <BanknoteIcon />
                  <span>{label}</span>
                  {fiatCurrency === currency && <CheckIcon className="ml-auto" />}
                </TrackedCommandItem>
              );
            })}
          {isSearching &&
            Object.values(ForecastPeriod).map((period) => {
              const label = forecastPeriodLabel(period);
              return (
                <TrackedCommandItem
                  key={period}
                  value={forecastValue(period)}
                  keywords={[label, 'forecast', 'maturity', 'rewards', 'period']}
                  onSelect={() => changeForecastPeriod(period)}
                >
                  <CalendarRangeIcon />
                  <span>{label}</span>
                  {forecastPeriod === period && <CheckIcon className="ml-auto" />}
                </TrackedCommandItem>
              );
            })}
        </CommandSection>

        <CommandSection
          ranked={isSearching}
          heading={t(($) => $.commandPalette.groups.advancedFeatures)}
        >
          {getSupportedAdvancedFeatures().map(({ key, icon: Icon }) => {
            const label = t(($) => $.userAccount.advancedFeatures.items[key].label);
            return (
              <TrackedCommandItem
                key={key}
                value={featureValue(key)}
                keywords={[label, ...FEATURE_KEYWORDS[key]]}
                onSelect={() => toggleFeature(key)}
              >
                <Icon />
                <span>{label}</span>
                {features[key] && <CheckIcon className="ml-auto" />}
              </TrackedCommandItem>
            );
          })}
        </CommandSection>

        {!isSearching && <CommandSeparator />}

        <CommandSection ranked={isSearching}>
          <TrackedCommandItem
            value={SIGN_OUT_VALUE}
            keywords={[signOutLabel, 'logout', 'log out']}
            onSelect={() => runAndClose(logout)}
          >
            <LogOutIcon />
            <span>{signOutLabel}</span>
          </TrackedCommandItem>
        </CommandSection>
      </CommandList>
      <CommandHintFooter />
      <CommandPaletteNoResultTracker />
    </CommandDialog>
  );
};
