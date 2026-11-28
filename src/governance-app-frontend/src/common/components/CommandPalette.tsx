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
  CirclePlusIcon,
  ClockIcon,
  CoinsIcon,
  EyeIcon,
  EyeOffIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FingerprintIcon,
  KeyboardIcon,
  LinkIcon,
  ListIcon,
  ListTodoIcon,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PackagePlusIcon,
  SendIcon,
  SunIcon,
  UsbIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import type { ComponentProps, CSSProperties, ElementType, KeyboardEvent } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { parseProposalId, ProposalFilter } from '@features/proposals/utils';
import { useLedgerSignerPrincipals } from '@features/stakes/hooks/useNeuronSigner';
import {
  getNeuronCommands,
  NEURON_COMMAND_ACTIONS,
  NeuronCommand,
} from '@features/stakes/utils/getNeuronCommands';

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
import { NeuronIcon } from '@components/icons/NeuronIcon';
import { Kbd } from '@components/Kbd';
import { getNavigationItems } from '@components/navigation/NavigationItems';
import { getSupportedAdvancedFeatures } from '@constants/advancedFeatures';
import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { Theme } from '@constants/theme';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import {
  closeCommandPalette,
  openCommandPalette,
  registerCommandPalette,
  restoreCommandPaletteFocus,
  useCommandPaletteOpen,
} from '@hooks/useCommandPaletteOpen';
import { useCommandPaletteShortcut } from '@hooks/useCommandPaletteShortcut';
import { useFiatCurrency } from '@hooks/useFiatCurrency';
import { useForecastPeriod } from '@hooks/useForecastPeriod';
import { useHideBalances } from '@hooks/useHideBalances';
import { HIDE_BALANCES_SHORTCUT_KEY } from '@hooks/useHideBalancesShortcut';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useLogout } from '@hooks/useLogout';
import { LOGOUT_SHORTCUT_KEY } from '@hooks/useLogoutShortcut';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { getShortcutTheme, THEME_SHORTCUT_KEY } from '@hooks/useThemeShortcut';
import { useVisibleViewport } from '@hooks/useVisibleViewport';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { isAccountsAreaEnabled, notifyAdvancedFeatureChange } from '@utils/advancedFeatures';
import { copyToClipboard } from '@utils/clipboard';
import { shortenNeuronId } from '@utils/neuron';
import { warningNotification } from '@utils/notification';
import { addRecentCommand, readRecentCommands } from '@utils/recentCommands';
import { isWebHidSupported } from '@common/ledger/webhid';

// We only support English for now.
const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });

const NAVIGATION_KEYWORDS: Record<string, string[]> = {
  '/dashboard': ['home', 'overview'],
  '/neurons': ['stake', 'stakes', 'staking'],
  '/voting': ['proposals', 'vote', 'governance'],
  '/accounts': ['wallet', 'balance', 'receive'],
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
  [AdvancedFeature.TransactionMemo]: ['memo', 'transaction'],
  [AdvancedFeature.LedgerDevice]: ['ledger', 'hardware wallet', 'device', 'nano'],
};

// The cmdk filter also scores letters that are far apart, for example "euro" in "Show all proposals".
// Such matches score below 0.05. Word, prefix, and abbreviation matches score above 0.15.
const MIN_MATCH_SCORE = 0.1;

const NEURON_COMMAND_KEYWORDS: Record<NeuronCommand, string[]> = {
  [NeuronCommand.Open]: ['neuron', 'details'],
  [NeuronCommand.IncreaseStake]: ['increase stake', 'add stake'],
  [NeuronCommand.IncreaseDelay]: ['delay', 'lock'],
  [NeuronCommand.StartDissolving]: ['dissolve', 'unlock'],
  [NeuronCommand.StopDissolving]: ['dissolve', 'lock'],
  [NeuronCommand.DisburseIcp]: ['disburse', 'withdraw'],
  [NeuronCommand.DisburseMaturity]: ['disburse', 'withdraw', 'rewards'],
  [NeuronCommand.StakeMaturity]: ['stake maturity', 'rewards'],
};

const NEURON_COMMAND_ICONS: Record<NeuronCommand, ElementType> = {
  [NeuronCommand.Open]: NeuronIcon,
  [NeuronCommand.IncreaseStake]: CirclePlusIcon,
  [NeuronCommand.IncreaseDelay]: ClockIcon,
  [NeuronCommand.StartDissolving]: LockOpenIcon,
  [NeuronCommand.StopDissolving]: LockIcon,
  [NeuronCommand.DisburseIcp]: CoinsIcon,
  [NeuronCommand.DisburseMaturity]: CoinsIcon,
  [NeuronCommand.StakeMaturity]: PackagePlusIcon,
};

// A command whose label or keywords hold a word that starts with each search word ranks above
// all fuzzy matches. The cmdk score orders the commands inside each tier. The cmdk value is the
// command id, for example `action:stake`, so the tiers read only the label and the keywords.
const LABEL_MATCH = 2;
const KEYWORD_MATCH = 1;

const toWords = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '');

/**
 * Below this visible height, the normal layout leaves room for fewer than 3 results, for example
 * on a phone in landscape with the on-screen keyboard open. The palette then starts at the top of
 * the visible area and has no hint footer, so the list gets all the space below the input.
 */
const SHORT_VISIBLE_HEIGHT = 280;

const scrollToTop = (list: HTMLElement) => {
  list.scrollTop = 0;
};

const filterCommands = (value: string, search: string, keywords: string[] = []) => {
  const score = defaultFilter(value, search, keywords);
  const terms = toWords(search);
  if (terms.length > 0) {
    // `renderItem` puts the label first in the keywords.
    const [label = '', ...rest] = keywords;
    const startsWords = (text: string) => {
      const words = toWords(text);
      return terms.every((term) => words.some((word) => word.startsWith(term)));
    };
    if (startsWords(label)) return LABEL_MATCH + score;
    if (startsWords(rest.join(' '))) return KEYWORD_MATCH + score;
  }
  return score >= MIN_MATCH_SCORE ? score : 0;
};

const TOGGLE_BALANCES_VALUE = 'toggle-balances';
const TOGGLE_SHORTCUTS_VALUE = 'toggle-shortcuts';
const SIGN_OUT_VALUE = 'signout';
/** Prefixes the cmdk value of a Recent item, because each cmdk value must be unique. */
const RECENT_VALUE_PREFIX = 'recent:';
const RECENT_LIMIT = 3;

const parseItemValue = (value: string) =>
  value.startsWith(RECENT_VALUE_PREFIX)
    ? { id: value.slice(RECENT_VALUE_PREFIX.length), recent: true }
    : { id: value, recent: false };

type CommandGroupId =
  | 'page'
  | 'navigate'
  | 'actions'
  | 'neurons'
  | 'proposals'
  | 'preferences'
  | 'advancedFeatures'
  | 'account';

/** The display order of the groups. A separator comes before a `separated` group. */
const GROUPS: Array<{ id: CommandGroupId; separated?: boolean }> = [
  { id: 'page' },
  { id: 'navigate' },
  { id: 'actions' },
  { id: 'neurons' },
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
  /** The single-key shortcut that does the same as `run`. */
  shortcut?: string;
  /** Muted text at the right of the item, for example a neuron ID. */
  detail?: string;
  /** The item shows only while the user searches. */
  searchOnly?: boolean;
  /** The palette stays open after `run`. */
  keepOpen?: boolean;
  /** The Recent group does not keep the item, for example when it depends on the search. */
  skipRecent?: boolean;
  run: () => void;
};

/** The "This page" group already shows the page commands, so the Recent group does not keep them. */
const keepsRecent = (command: PaletteCommand) => !command.skipRecent && command.group !== 'page';

type HintKey =
  | 'copyToClipboard'
  | 'goBack'
  | 'goToPage'
  | 'openProposal'
  | 'runAction'
  | 'openNeuron'
  | 'setCurrency'
  | 'setForecastPeriod'
  | 'applyTheme'
  | 'toggleBalances'
  | 'toggleShortcuts'
  | 'toggleFeature'
  | 'signOut';

const getHintKey = (value: unknown): HintKey | null => {
  if (typeof value !== 'string' || value === '') return null;
  const { id } = parseItemValue(value);
  return getCommandHintKey(id);
};

const getCommandHintKey = (value: string): HintKey | null => {
  if (value.startsWith('copy:')) return 'copyToClipboard';
  if (value.startsWith('back:')) return 'goBack';
  if (value.startsWith('nav:') || value.startsWith('proposals:')) return 'goToPage';
  if (value.startsWith('theme:')) return 'applyTheme';
  if (value.startsWith('feature:')) return 'toggleFeature';
  if (value.startsWith('action:')) return 'runAction';
  if (value.startsWith('neuron:')) return 'openNeuron';
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

const getAnalyticsItem = (value: string): string => {
  if (/^\d+$/.test(value)) return 'proposal';
  // `neuron:<command>:<neuron ID>` without the neuron ID.
  if (value.startsWith('neuron:')) return value.split(':').slice(0, 2).join(':');
  return value;
};

/**
 * CommandItem that reports the selected item to analytics. A proposal ID is reported as
 * `proposal`. A neuron command is reported without the neuron ID. A Recent item is reported as its
 * command id with `source: 'recent'`.
 *
 * During the exit animation the list keeps the results, so Return or a click can still select an
 * item. The item ignores such a selection.
 */
const TrackedCommandItem = ({ onSelect, ...props }: ComponentProps<typeof CommandItem>) => {
  const open = useCommandPaletteOpen();
  return (
    <CommandItem
      {...props}
      onSelect={(value) => {
        if (!open) return;
        const { id, recent } = parseItemValue(value);
        analytics.event(AnalyticsEvent.CommandPaletteSelect, {
          item: getAnalyticsItem(id),
          ...(recent && { source: 'recent' }),
        });
        onSelect?.(value);
      }}
    />
  );
};

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
  const { identity } = useInternetIdentity();
  const ledgerPrincipals = useLedgerSignerPrincipals();
  const icpLedger = useIcpLedger();
  const logout = useLogout('command_palette');
  const proposalMatch = useMatch({ from: '/_auth/voting/proposals/$id/', shouldThrow: false });
  const open = useCommandPaletteOpen();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<HTMLDivElement | null>(null);
  // Read on open, so the Recent items do not move while the palette is open. A button can open
  // the palette too, so this follows the shared open state. The search also resets on open, so
  // the list keeps the results during the exit animation.
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRecentIds(readRecentCommands());
      setSearch('');
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (next) return openCommandPalette('shortcut');
    closeCommandPalette();
  };

  useCommandPaletteShortcut(() => handleOpenChange(!open));

  useEffect(() => registerCommandPalette(), []);

  // While the first result is selected, the list stays at the top. cmdk can scroll to the old
  // selection after a search change, and it can sort the rows after it selects the new first one.
  // So the list checks again after each selection change and each row move. A wheel or touch
  // scroll stops this until the next search change.
  const visibleViewport = useVisibleViewport(open);
  const isShort = visibleViewport !== undefined && visibleViewport.height < SHORT_VISIBLE_HEIGHT;

  const keepTopRef = useRef(true);
  useEffect(() => {
    if (!list) return;
    scrollToTop(list);
    keepTopRef.current = true;
  }, [list, search]);

  useEffect(() => {
    if (!list) return;
    const observer = new MutationObserver(() => {
      if (!keepTopRef.current) return;
      const first = list.querySelector('[cmdk-item]:not([aria-disabled="true"])');
      if (first?.getAttribute('aria-selected') === 'true') scrollToTop(list);
    });
    observer.observe(list, { subtree: true, childList: true, attributeFilter: ['aria-selected'] });
    const stopKeepTop = () => {
      keepTopRef.current = false;
    };
    list.addEventListener('wheel', stopKeepTop, { passive: true });
    list.addEventListener('touchmove', stopKeepTop, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener('wheel', stopKeepTop);
      list.removeEventListener('touchmove', stopKeepTop);
    };
  }, [list]);

  // If the selected row or the no-results message is not fully in view, for example in landscape
  // with the on-screen keyboard open, Return closes the keyboard and keeps the search. The user can
  // then read the results before a command runs.
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // The Enter that confirms an input method editor (IME) composition belongs to the IME. Safari
    // sends it with key code 229.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key !== 'Enter' || !list) return;
    const target = list.querySelector('[cmdk-item][aria-selected="true"], [cmdk-empty]');
    if (!target) return;
    const area = list.getBoundingClientRect();
    const { top, bottom } = target.getBoundingClientRect();
    // 1px covers rounding.
    if (top >= area.top - 1 && bottom <= area.bottom + 1) return;
    event.preventDefault();
    event.currentTarget.blur();
  };

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

  const neuronCommandLabels: Record<NeuronCommand, string> = {
    [NeuronCommand.Open]: t(($) => $.commandPalette.items.openNeuron),
    [NeuronCommand.IncreaseStake]: t(($) => $.neuronDetailModal.actions.increaseStake),
    [NeuronCommand.IncreaseDelay]: t(($) => $.neuronDetailModal.actions.increaseDelay),
    [NeuronCommand.StartDissolving]: t(($) => $.neuronDetailModal.actions.startDissolving),
    [NeuronCommand.StopDissolving]: t(($) => $.neuronDetailModal.actions.stopDissolving),
    [NeuronCommand.DisburseIcp]: t(($) => $.neuron.disburseIcp),
    [NeuronCommand.DisburseMaturity]: t(($) => $.neuron.disburseMaturity),
    [NeuronCommand.StakeMaturity]: t(($) => $.neuron.stakeMaturity),
  };

  // The list has one item for each action of each neuron, so it shows only while the user searches.
  const neuronCommands = (userNeurons ?? []).flatMap((neuron) => {
    const neuronId = neuron.neuronId.toString();
    const shortId = shortenNeuronId(neuron.neuronId);
    return getNeuronCommands({
      neuron,
      principalId: identity?.getPrincipal().toText(),
      ledgerPrincipals,
    }).map(
      (command): PaletteCommand => ({
        id: `neuron:${command}:${neuronId}`,
        group: 'neurons',
        label: neuronCommandLabels[command],
        keywords: [...NEURON_COMMAND_KEYWORDS[command], neuronId, shortId],
        icon: NEURON_COMMAND_ICONS[command],
        detail: t(($) => $.commandPalette.items.neuronId, { id: shortId }),
        searchOnly: true,
        run: () =>
          navigate({
            to: '/neurons',
            search: { neuronId, action: NEURON_COMMAND_ACTIONS[command] },
          }),
      }),
    );
  });

  // A touch screen has no keyboard for the shortcuts, so it gets no hints.
  const hasFinePointer = useMediaQuery('(pointer: fine)');
  const shortcutHint = (key: string) => (shortcutsEnabled && hasFinePointer ? key : undefined);
  const shortcutTheme = getShortcutTheme(theme);

  const groupHeadings: Record<CommandGroupId, string | undefined> = {
    page: t(($) => $.commandPalette.groups.page),
    navigate: t(($) => $.commandPalette.groups.navigate),
    actions: t(($) => $.commandPalette.groups.actions),
    neurons: t(($) => $.commandPalette.groups.neurons),
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
      id: 'nav:/reports',
      group: 'navigate',
      label: t(($) => $.reports.title),
      keywords: ['csv', 'export', 'download', 'year summary', 'transactions'],
      icon: FileSpreadsheetIcon,
      run: () => navigate({ to: '/reports' }),
    },
    {
      id: 'action:receive',
      group: 'actions',
      label: t(($) => $.commandPalette.items.receiveIcp),
      keywords: ['deposit', 'address', 'qr code', 'account id'],
      icon: ArrowDownToLineIcon,
      run: () => navigate({ to: '/dashboard', search: { depositModal: true } }),
    },
    {
      id: 'action:send',
      group: 'actions',
      label: t(($) => $.commandPalette.items.sendIcp),
      keywords: ['withdraw', 'transfer', 'pay'],
      icon: SendIcon,
      disabled: !icpLedger.ready || !icpLedger.authenticated,
      run: () => navigate({ to: '/dashboard', search: { sendModal: true } }),
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
    // Settings shows the Ledger devices card only with the feature on and WebHID.
    ...(features[AdvancedFeature.LedgerDevice] && isWebHidSupported()
      ? [
          {
            id: 'action:addLedgerDevice',
            group: 'actions',
            label: t(($) => $.commandPalette.items.addLedgerDevice),
            keywords: ['connect ledger', 'hardware wallet', 'device', 'nano'],
            icon: UsbIcon,
            run: () => navigate({ to: '/settings', search: { addLedgerDevice: true } }),
          } satisfies PaletteCommand,
        ]
      : []),
    ...neuronCommands,
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
            skipRecent: true,
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
            skipRecent: true,
            run: () => {},
          } satisfies PaletteCommand,
        ]
      : []),
    {
      id: `proposals:${ProposalFilter.Open}`,
      group: 'proposals',
      label: t(($) => $.commandPalette.items.openProposals),
      keywords: ['active', 'pending', 'vote', 'voting'],
      icon: ListTodoIcon,
      run: () =>
        navigate({
          to: '/voting',
          search: { showProposals: true, proposalFilter: ProposalFilter.Open },
        }),
    },
    {
      id: `proposals:${ProposalFilter.All}`,
      group: 'proposals',
      label: t(($) => $.commandPalette.items.allProposals),
      keywords: ['history', 'past', 'executed', 'list'],
      icon: ListIcon,
      run: () =>
        navigate({
          to: '/voting',
          search: { showProposals: true, proposalFilter: ProposalFilter.All },
        }),
    },
    ...themeItems.map(
      ({ theme: itemTheme, icon, label }): PaletteCommand => ({
        id: `theme:${itemTheme}`,
        group: 'preferences',
        label,
        keywords: ['appearance', 'color'],
        icon,
        checked: theme === itemTheme,
        shortcut: itemTheme === shortcutTheme ? shortcutHint(THEME_SHORTCUT_KEY) : undefined,
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
      shortcut: shortcutHint(HIDE_BALANCES_SHORTCUT_KEY),
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
      shortcut: shortcutHint(LOGOUT_SHORTCUT_KEY),
      skipRecent: true,
      run: logout,
    },
  ];

  const visibleCommands = commands.filter((command) => isSearching || !command.searchOnly);

  // A stored id that no longer has a command, for example a feature that is off, is dropped.
  const recentCommands = isSearching
    ? []
    : recentIds
        .map((id) => commands.find((command) => command.id === id && keepsRecent(command)))
        .filter(nonNullish)
        .slice(0, RECENT_LIMIT);

  const renderItem = (command: PaletteCommand, value: string) => (
    <TrackedCommandItem
      key={value}
      value={value}
      keywords={[command.label, ...(command.keywords ?? [])]}
      disabled={command.disabled}
      aria-keyshortcuts={command.shortcut}
      onSelect={() => {
        if (keepsRecent(command)) addRecentCommand(command.id);
        if (command.keepOpen) command.run();
        else runAndClose(command.run);
      }}
    >
      <command.icon />
      <span>{command.label}</span>
      {/* The space separates the label and the detail in the accessible name. */}
      {nonNullish(command.detail) && (
        <>
          {' '}
          <span className="ml-auto text-xs text-muted-foreground">{command.detail}</span>
        </>
      )}
      {nonNullish(command.shortcut) && (
        // `aria-keyshortcuts` gives the key to screen readers.
        <CommandShortcut aria-hidden className="tracking-normal">
          {/* In dark mode, the muted fill is the color of the palette. */}
          <Kbd className="border">{command.shortcut}</Kbd>
        </CommandShortcut>
      )}
      {command.checked && <CheckIcon className="ml-auto" />}
    </TrackedCommandItem>
  );

  return (
    <CommandDialog
      // A fixed top keeps the search field in place while the result list changes its height. The
      // top and the list height follow the visible area, which an on-screen keyboard makes smaller.
      className={
        isShort
          ? 'top-[var(--visible-top,0px)] translate-y-0'
          : 'top-[calc(var(--visible-top,0px)+min(20vh,var(--visible-height,100vh)*0.2))] translate-y-0'
      }
      style={
        visibleViewport &&
        ({
          '--visible-top': `${visibleViewport.top}px`,
          '--visible-height': `${visibleViewport.height}px`,
        } as CSSProperties)
      }
      open={open}
      onOpenChange={handleOpenChange}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreCommandPaletteFocus();
      }}
      title={t(($) => $.commandPalette.title)}
      description={t(($) => $.commandPalette.description)}
      showCloseButton={false}
      filter={filterCommands}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleInputKeyDown}
        placeholder={t(($) => $.commandPalette.placeholder)}
      />
      {/* The list shrinks with the visible area, so the input and the footer stay in view. */}
      <CommandList
        ref={setList}
        className={
          isShort
            ? 'max-h-[calc(var(--visible-height)-3.25rem)]'
            : 'max-h-[min(300px,calc(var(--visible-height,100dvh)*0.8-6rem))]'
        }
      >
        <CommandEmpty className={isShort ? 'py-2' : undefined}>
          {t(($) => $.commandPalette.empty)}
        </CommandEmpty>

        {recentCommands.length > 0 && (
          <CommandGroup heading={t(($) => $.commandPalette.groups.recent)}>
            {recentCommands.map((command) =>
              renderItem(command, `${RECENT_VALUE_PREFIX}${command.id}`),
            )}
          </CommandGroup>
        )}

        {GROUPS.map(({ id, separated }) => {
          const groupCommands = visibleCommands.filter((command) => command.group === id);
          if (groupCommands.length === 0) return null;

          return (
            <Fragment key={id}>
              {separated && !isSearching && <CommandSeparator />}
              <CommandSection ranked={isSearching} heading={groupHeadings[id]}>
                {groupCommands.map((command) => renderItem(command, command.id))}
              </CommandSection>
            </Fragment>
          );
        })}
      </CommandList>
      {!isShort && <CommandHintFooter />}
      <CommandPaletteNoResultTracker open={open} />
    </CommandDialog>
  );
};
