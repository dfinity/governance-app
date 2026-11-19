import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import {
  ArrowDownToLineIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  BookUserIcon,
  CalendarRangeIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  FingerprintIcon,
  KeyboardIcon,
  LinkIcon,
  LockIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import type { ComponentProps, ElementType } from 'react';
import { Fragment, useState } from 'react';
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
  CommandShortcut,
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
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useLogout } from '@hooks/useLogout';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { isAccountsAreaEnabled, notifyAdvancedFeatureChange } from '@utils/advancedFeatures';
import { copyToClipboard } from '@utils/clipboard';
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

type CommandGroupId =
  | 'page'
  | 'navigate'
  | 'actions'
  | 'proposals'
  | 'preferences'
  | 'advancedFeatures'
  | 'account';

/** The display order of the groups. A separator comes before a `separated` group. */
const GROUPS: Array<{ id: CommandGroupId; separated?: boolean }> = [
  { id: 'page' },
  { id: 'navigate' },
  { id: 'actions' },
  { id: 'proposals' },
  { id: 'preferences', separated: true },
  { id: 'advancedFeatures' },
  { id: 'account', separated: true },
];

type PaletteCommand = {
  /** The cmdk value. Analytics and the hint footer read it. */
  id: string;
  group: CommandGroupId;
  label: string;
  /** More search words. The item also matches its label, which comes first. */
  keywords?: string[];
  icon: ElementType;
  disabled?: boolean;
  /** Shows a checkmark, for example on the current theme. */
  checked?: boolean;
  shortcut?: string;
  /** The item shows only while the user searches. */
  searchOnly?: boolean;
  /** The palette stays open after `run`. */
  keepOpen?: boolean;
  run: () => void;
};

type HintKey =
  | 'copyToClipboard'
  | 'goBack'
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
  if (value.startsWith('copy:')) return 'copyToClipboard';
  if (value.startsWith('back:')) return 'goBack';
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
  const { identity } = useInternetIdentity();
  const proposalMatch = useMatch({ from: '/_auth/voting/proposals/$id/', shouldThrow: false });
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

  const userNeurons = neuronsQuery.data?.response;

  const forecastPeriodLabel = (period: ForecastPeriod) =>
    t(($) => $.commandPalette.items.forecastPeriod, {
      period: t(($) => $.userAccount.forecastPeriod.options[period]),
    });

  const isSearching = trimmedSearch !== '';

  const groupHeadings: Record<CommandGroupId, string | undefined> = {
    page: t(($) => $.commandPalette.groups.page),
    navigate: t(($) => $.commandPalette.groups.navigate),
    actions: t(($) => $.commandPalette.groups.actions),
    proposals: t(($) => $.commandPalette.groups.proposals),
    preferences: t(($) => $.commandPalette.groups.preferences),
    advancedFeatures: t(($) => $.commandPalette.groups.advancedFeatures),
    account: undefined,
  };

  const themeItems = [
    { theme: Theme.Light, icon: SunIcon, label: t(($) => $.commandPalette.items.themeLight) },
    { theme: Theme.Dark, icon: MoonIcon, label: t(($) => $.commandPalette.items.themeDark) },
    { theme: Theme.System, icon: MonitorIcon, label: t(($) => $.commandPalette.items.themeSystem) },
  ];

  const copy = (value: string, label: string) => void copyToClipboard({ t, value, label });

  const proposalCommands: PaletteCommand[] = proposalMatch
    ? [
        {
          id: 'copy:proposalLink',
          group: 'page',
          label: t(($) => $.commandPalette.items.copyProposalLink),
          keywords: ['share', 'url'],
          icon: LinkIcon,
          run: () =>
            copy(
              new URL(`/voting/proposals/${proposalMatch.params.id}`, window.location.origin).href,
              t(($) => $.commandPalette.copyLabels.proposalLink),
            ),
        },
        {
          id: 'back:proposals',
          group: 'page',
          label: t(($) => $.proposal.backToProposals),
          keywords: ['return', 'list'],
          icon: ArrowLeftIcon,
          // The same target as the Back link of the proposal page.
          run: () =>
            navigate({
              to: '/voting',
              search: {
                showProposals: true,
                proposalFilter: proposalMatch.search.proposalFilter,
              },
            }),
        },
      ]
    : [];

  const identityCommands: PaletteCommand[] = identity
    ? [
        {
          id: 'copy:accountId',
          group: 'page',
          label: t(($) => $.commandPalette.items.copyAccountId),
          keywords: ['account id', 'address', 'wallet'],
          icon: WalletIcon,
          run: () =>
            copy(
              AccountIdentifier.fromPrincipal({ principal: identity.getPrincipal() }).toHex(),
              t(($) => $.userAccount.accountId),
            ),
        },
        {
          id: 'copy:principal',
          group: 'page',
          label: t(($) => $.commandPalette.items.copyPrincipal),
          keywords: ['principal', 'identity'],
          icon: FingerprintIcon,
          run: () =>
            copy(
              identity.getPrincipal().toText(),
              t(($) => $.userAccount.principalId),
            ),
        },
      ]
    : [];

  const commands: PaletteCommand[] = [
    ...proposalCommands,
    ...identityCommands,
    ...navigationItems.map(
      (item): PaletteCommand => ({
        id: `nav:${item.href}`,
        group: 'navigate',
        label: t(item.label as never),
        keywords: NAVIGATION_KEYWORDS[item.href],
        icon: item.icon,
        run: () => navigate({ to: item.href }),
      }),
    ),
    {
      id: 'action:receive',
      group: 'actions',
      label: t(($) => $.commandPalette.items.receiveIcp),
      keywords: ['deposit', 'address', 'qr code', 'account id'],
      icon: ArrowDownToLineIcon,
      run: () => navigate({ to: '/dashboard', search: { depositModal: true } }),
    },
    {
      id: 'action:stake',
      group: 'actions',
      label: t(($) => $.commandPalette.items.stakeIcp),
      keywords: ['neuron', 'staking', 'create neuron', 'wizard'],
      icon: LockIcon,
      run: () => navigate({ to: '/neurons', search: { openWizard: true } }),
    },
    {
      id: 'action:manageFollowing',
      group: 'actions',
      label: t(($) => $.commandPalette.items.manageFollowing),
      keywords: ['follow', 'followees', 'vote', 'known neuron'],
      icon: UsersIcon,
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
      id: 'action:addressBook',
      group: 'actions',
      label: t(($) => $.commandPalette.items.addressBook),
      keywords: ['contacts', 'addresses', 'saved addresses'],
      icon: BookUserIcon,
      run: () => navigate({ to: '/settings', search: { openAddressBook: true } }),
    },
    ...(nonNullish(proposalIdMatch)
      ? [
          {
            // Analytics reports a numeric value as `proposal`.
            id: trimmedSearch,
            group: 'proposals',
            label: t(($) => $.commandPalette.items.goToProposal, {
              id: proposalIdMatch.toString(),
            }),
            icon: FileTextIcon,
            run: () => navigate({ to: '/voting/proposals/$id', params: { id: proposalIdMatch } }),
          } satisfies PaletteCommand,
        ]
      : []),
    ...(showProposalHint
      ? [
          {
            id: 'proposal-hint',
            group: 'proposals',
            label: t(($) => $.commandPalette.items.proposalHint),
            icon: FileTextIcon,
            disabled: true,
            run: () => {},
          } satisfies PaletteCommand,
        ]
      : []),
    ...themeItems.map(
      ({ theme: itemTheme, icon, label }): PaletteCommand => ({
        id: `theme:${itemTheme}`,
        group: 'preferences',
        label,
        keywords: ['appearance', 'color'],
        icon,
        checked: theme === itemTheme,
        keepOpen: true,
        run: () => setTheme(itemTheme),
      }),
    ),
    {
      id: TOGGLE_BALANCES_VALUE,
      group: 'preferences',
      label: hidden
        ? t(($) => $.commandPalette.items.showBalances)
        : t(($) => $.commandPalette.items.hideBalances),
      keywords: ['privacy', 'balance'],
      icon: hidden ? EyeIcon : EyeOffIcon,
      run: () => setHidden(!hidden),
    },
    {
      id: TOGGLE_SHORTCUTS_VALUE,
      group: 'preferences',
      label: t(($) => $.commandPalette.items.keyboardShortcuts),
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys'],
      icon: KeyboardIcon,
      checked: shortcutsEnabled,
      // The checkmark is the only feedback this toggle gives.
      keepOpen: true,
      run: () => setShortcutsEnabled(!shortcutsEnabled),
    },
    // The currency and forecast options are long lists, so they show only while the user searches.
    ...Object.values(FiatCurrency).map(
      (currency): PaletteCommand => ({
        id: `currency:${currency}`,
        group: 'preferences',
        label: t(($) => $.commandPalette.items.fiatCurrency, {
          name: currencyNames.of(currency),
          code: currency,
        }),
        keywords: ['currency', 'fiat', 'money'],
        icon: BanknoteIcon,
        checked: fiatCurrency === currency,
        searchOnly: true,
        keepOpen: true,
        run: () => setFiatCurrency(currency),
      }),
    ),
    ...Object.values(ForecastPeriod).map(
      (period): PaletteCommand => ({
        id: `forecast:${period}`,
        group: 'preferences',
        label: forecastPeriodLabel(period),
        keywords: ['forecast', 'maturity', 'rewards', 'period'],
        icon: CalendarRangeIcon,
        checked: forecastPeriod === period,
        searchOnly: true,
        keepOpen: true,
        run: () => {
          setForecastPeriod(period);
          analytics.event(AnalyticsEvent.ForecastPeriodChange, {
            period,
            source: 'command_palette',
          });
        },
      }),
    ),
    ...getSupportedAdvancedFeatures().map(
      ({ key, icon }): PaletteCommand => ({
        id: `feature:${key}`,
        group: 'advancedFeatures',
        label: t(($) => $.userAccount.advancedFeatures.items[key].label),
        keywords: FEATURE_KEYWORDS[key],
        icon,
        checked: features[key],
        run: () => {
          const next = !features[key];
          setFeature(key, next);
          notifyAdvancedFeatureChange(t, key, next);
        },
      }),
    ),
    {
      id: SIGN_OUT_VALUE,
      group: 'account',
      label: t(($) => $.commandPalette.items.signOut),
      keywords: ['logout', 'log out'],
      icon: LogOutIcon,
      run: logout,
    },
  ];

  const visibleCommands = commands.filter((command) => isSearching || !command.searchOnly);

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

        {GROUPS.map(({ id, separated }) => {
          const groupCommands = visibleCommands.filter((command) => command.group === id);
          if (groupCommands.length === 0) return null;

          return (
            <Fragment key={id}>
              {separated && !isSearching && <CommandSeparator />}
              <CommandSection ranked={isSearching} heading={groupHeadings[id]}>
                {groupCommands.map((command) => (
                  <TrackedCommandItem
                    key={command.id}
                    value={command.id}
                    keywords={[command.label, ...(command.keywords ?? [])]}
                    disabled={command.disabled}
                    onSelect={() => (command.keepOpen ? command.run() : runAndClose(command.run))}
                  >
                    <command.icon />
                    <span>{command.label}</span>
                    {nonNullish(command.shortcut) && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                    {command.checked && <CheckIcon className="ml-auto" />}
                  </TrackedCommandItem>
                ))}
              </CommandSection>
            </Fragment>
          );
        })}
      </CommandList>
      <CommandHintFooter />
      <CommandPaletteNoResultTracker open={open} />
    </CommandDialog>
  );
};
