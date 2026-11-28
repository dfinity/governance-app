import '@/i18n/config';

import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { ProposalFilter } from '@features/proposals/utils';

import {
  COMMAND_PALETTE_RECENT_STORAGE_KEY,
  SHORTCUTS_SETTINGS_KEY,
  THEME_STORAGE_KEY,
} from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { Theme } from '@constants/theme';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { errorNotification, successNotification, warningNotification } from '@utils/notification';

import { CommandPalette } from './CommandPalette';
import { CommandPaletteButton } from './navigation/CommandPaletteButton';

const LOCKED_ID = 1664112345678949305n;
const DISSOLVING_ID = 7331012345678958442n;

const mockNeuron = (neuronId: bigint, state: NeuronState): NeuronInfo =>
  ({
    neuronId,
    state,
    dissolveDelaySeconds: 0n,
    fullNeuron: { controller: PRINCIPAL, hotKeys: [], cachedNeuronStake: 1n, neuronFees: 0n },
  }) as unknown as NeuronInfo;

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  openPalette: undefined as (() => void) | undefined,
  neurons: [] as unknown[] | undefined,
  setFiatCurrency: vi.fn(),
  setForecastPeriod: vi.fn(),
  proposalMatch: undefined as
    | { params: { id: bigint }; search: { proposalFilter?: string } }
    | undefined,
  principal: undefined as Principal | undefined,
  finePointer: true,
  icpLedgerReady: true,
  webHid: false,
  privateNames: [] as string[],
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useMatch: () => mocks.proposalMatch,
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: mocks.principal && { getPrincipal: () => mocks.principal },
  }),
}));

vi.mock('@hooks/useCommandPaletteShortcut', () => ({
  useCommandPaletteShortcut: (onTrigger: () => void) => {
    mocks.openPalette = onTrigger;
  },
}));

vi.mock('@hooks/governance', () => ({
  useGovernanceNeurons: () => ({ data: mocks.neurons && { response: mocks.neurons } }),
}));

vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useLedgerSignerPrincipals: () => [],
}));

vi.mock('@hooks/icpLedger/useIcpLedger', () => ({
  useIcpLedger: () => ({
    ready: mocks.icpLedgerReady,
    authenticated: mocks.icpLedgerReady,
    canister: undefined,
  }),
}));

vi.mock('@common/ledger/webhid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@common/ledger/webhid')>()),
  isWebHidSupported: () => mocks.webHid,
}));

vi.mock('@hooks/useLogout', () => ({ useLogout: () => vi.fn() }));

vi.mock('@hooks/useFiatCurrency', () => ({
  useFiatCurrency: () => ({
    fiatCurrency: FiatCurrency.USD,
    setFiatCurrency: mocks.setFiatCurrency,
  }),
}));

vi.mock('@hooks/useForecastPeriod', () => ({
  useForecastPeriod: () => ({
    forecastPeriod: ForecastPeriod.Year,
    setForecastPeriod: mocks.setForecastPeriod,
  }),
}));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => mocks.finePointer }));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));
vi.mock('@features/analytics/usePrivateNames', () => ({
  usePrivateNames: () => mocks.privateNames,
}));

vi.mock('@utils/notification', () => ({
  errorNotification: vi.fn(),
  successNotification: vi.fn(),
  warningNotification: vi.fn(),
}));

const PRINCIPAL = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

const setLedgerFeature = (enabled: boolean) => {
  const { result } = renderHook(() => useAdvancedFeatures());
  act(() => result.current.setFeature(AdvancedFeature.LedgerDevice, enabled));
};

const openPalette = () => {
  render(<CommandPalette />);
  act(() => mocks.openPalette?.());
};

const togglePalette = () => act(() => mocks.openPalette?.());

const storeRecent = (ids: string[]) =>
  localStorage.setItem(COMMAND_PALETTE_RECENT_STORAGE_KEY, JSON.stringify(ids));

const storedRecent = () =>
  JSON.parse(localStorage.getItem(COMMAND_PALETTE_RECENT_STORAGE_KEY) ?? '[]') as string[];

const recentNames = () =>
  within(screen.getByRole('group', { name: 'Recent' }))
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');

const search = (query: string) =>
  fireEvent.change(screen.getByRole('combobox'), { target: { value: query } });

const optionNames = () =>
  screen
    .queryAllByRole('option')
    .filter((option) => option.getAttribute('aria-disabled') !== 'true')
    .map((option) => option.textContent ?? '');

/**
 * jsdom has no CSS animations, so Radix removes the dialog at once. This gives the dialog an exit
 * animation, which ends at an `animationend` event.
 */
const stubExitAnimation = () => {
  const getComputedStyle = window.getComputedStyle.bind(window);
  const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const styles = getComputedStyle(element, pseudo);
    if (element.getAttribute('role') === 'dialog') {
      Object.defineProperty(styles, 'animationName', {
        get: () => (element.getAttribute('data-state') === 'closed' ? 'exit' : 'enter'),
      });
    }
    return styles;
  });
  onTestFinished(() => spy.mockRestore());
  vi.stubGlobal('CSS', { escape: (value: string) => value });
};

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    mocks.neurons = [];
    mocks.proposalMatch = undefined;
    mocks.principal = Principal.fromText(PRINCIPAL);
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    mocks.finePointer = true;
    mocks.icpLedgerReady = true;
    mocks.webHid = false;
  });

  afterEach(() => setLedgerFeature(false));

  it('gives the focus back to the search button on Escape.', async () => {
    render(
      <>
        <CommandPaletteButton variant="header" />
        <CommandPalette />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Search' });

    await userEvent.click(button);
    expect(screen.getByRole('combobox')).toBeTruthy();
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it('finds each item by its visible label.', () => {
    openPalette();
    const labels = optionNames();
    expect(labels.length).toBeGreaterThan(0);

    for (const label of labels) {
      search(label);
      expect(optionNames()).toContain(label);
    }
  });

  it('finds the currency and forecast options by their labels.', () => {
    openPalette();
    expect(optionNames()).not.toContain('Show values in Euro (EUR)');

    search('Show values in Euro');
    expect(optionNames()).toContain('Show values in Euro (EUR)');

    search('Forecast period: Day');
    expect(optionNames()).toContain('Forecast period: Day');
  });

  it('puts the best match first and drops scattered letter matches.', () => {
    openPalette();
    search('eur');

    expect(optionNames()[0]).toBe('Show values in Euro (EUR)');
    expect(optionNames()).toContain('Voting neurons');
    expect(optionNames()).not.toContain('Show all proposals');
  });

  it('puts a label that starts with the search above a keyword match.', () => {
    openPalette();
    search('stake');

    const names = optionNames();
    expect(names[0]).toBe('Stake ICP');
    expect(names).toContain('Voting neurons');
  });

  it('puts the currency with the searched code first.', () => {
    openPalette();
    search('chf');

    expect(optionNames()[0]).toBe('Show values in Swiss Franc (CHF)');
  });

  it('keeps the top of the palette fixed.', () => {
    openPalette();

    const { classList } = screen.getByRole('dialog');
    expect(
      classList.contains(
        'top-[calc(var(--visible-top,0px)+min(20vh,var(--visible-height,100vh)*0.2))]',
      ),
    ).toBe(true);
    expect(classList.contains('translate-y-0')).toBe(true);
    expect(classList.contains('top-[50%]')).toBe(false);
  });

  it('caps the list height to the visible area below the fixed top.', () => {
    openPalette();

    const list = document.querySelector('[cmdk-list]');
    expect(
      list?.classList.contains('max-h-[min(300px,calc(var(--visible-height,100dvh)*0.8-6rem))]'),
    ).toBe(true);
    expect(list?.classList.contains('max-h-[300px]')).toBe(false);
  });

  it('gives the list all the space below the input on a short visible area.', () => {
    vi.stubGlobal(
      'visualViewport',
      Object.assign(new EventTarget(), { offsetTop: 0, height: 800 }),
    );
    openPalette();
    expect(screen.getByText('Copy to clipboard')).toBeTruthy();

    act(() => {
      Object.assign(window.visualViewport ?? {}, { height: 150 });
      window.visualViewport?.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByRole('dialog').classList.contains('top-[var(--visible-top,0px)]')).toBe(
      true,
    );
    const list = document.querySelector('[cmdk-list]');
    expect(list?.classList.contains('max-h-[calc(var(--visible-height)-3.25rem)]')).toBe(true);
    expect(screen.queryByText('Copy to clipboard')).toBeNull();
    vi.stubGlobal('visualViewport', undefined);
  });

  // Gives the list and the element the vertical bounds of a layout.
  const layOut = (element: Element, [top, bottom]: [number, number]) => {
    element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
  };

  const layOutSelected = (list: [number, number], row: [number, number]) => {
    const listElement = document.querySelector('[cmdk-list]');
    const selected = document.querySelector('[cmdk-item][aria-selected="true"]');
    if (!listElement || !selected) throw new Error('no list');
    layOut(listElement, list);
    layOut(selected, row);
  };

  it('runs the selected command on Return when its row is in view.', () => {
    openPalette();
    search('send');
    layOutSelected([0, 300], [8, 44]);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/dashboard', search: { sendModal: true } });
  });

  it.each([
    ['no row fits', [0, 8], [8, 44]],
    ['the row is below a heading in a short list', [0, 88], [60, 96]],
  ] satisfies Array<[string, [number, number], [number, number]]>)(
    'closes the keyboard on Return when %s.',
    (_, list, row) => {
      openPalette();
      search('send');
      const input = screen.getByRole('combobox');
      layOutSelected(list, row);
      input.focus();

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mocks.navigate).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(input);
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect((input as HTMLInputElement).value).toBe('send');
    },
  );

  it('closes the keyboard on Return when the no-results message is cut off.', () => {
    openPalette();
    search('zzqqxx');
    const input = screen.getByRole('combobox');
    const list = document.querySelector('[cmdk-list]');
    const empty = screen.getByText('No results found.');
    if (!list) throw new Error('no list');
    layOut(list, [0, 8]);
    layOut(empty, [0, 44]);
    input.focus();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(document.activeElement).not.toBe(input);
    expect((input as HTMLInputElement).value).toBe('zzqqxx');
  });

  it('leaves the Return of an IME composition to the IME when no result row fits.', () => {
    openPalette();
    search('send');
    const input = screen.getByRole('combobox');
    layOutSelected([0, 8], [8, 44]);
    input.focus();

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(document.activeElement).toBe(input);
  });

  it('follows the visible area when an on-screen keyboard opens.', () => {
    const viewport = Object.assign(new EventTarget(), { offsetTop: 0, height: 800 });
    vi.stubGlobal('visualViewport', viewport);
    openPalette();
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.getPropertyValue('--visible-top')).toBe('0px');
    expect(dialog.style.getPropertyValue('--visible-height')).toBe('800px');

    act(() => {
      Object.assign(viewport, { offsetTop: 120, height: 330.4 });
      viewport.dispatchEvent(new Event('resize'));
    });

    expect(dialog.style.getPropertyValue('--visible-top')).toBe('120px');
    expect(dialog.style.getPropertyValue('--visible-height')).toBe('330px');
    vi.stubGlobal('visualViewport', undefined);
  });

  it('scrolls the list to the top when the search changes.', () => {
    openPalette();
    const list = document.querySelector<HTMLElement>('[cmdk-list]');
    if (!list) throw new Error('no list');
    list.scrollTop = 400;

    search('euro');

    expect(list.scrollTop).toBe(0);
  });

  it('shows the first result after the search changes with a lower row selected.', async () => {
    openPalette();
    const list = document.querySelector<HTMLElement>('[cmdk-list]');
    if (!list) throw new Error('no list');
    // A list that shows 3 rows of 40px. `scrollIntoView` scrolls it as a browser does.
    const ROW = 40;
    const VISIBLE = 3 * ROW;
    Element.prototype.scrollIntoView = function (this: Element) {
      const top = [...list.querySelectorAll('[cmdk-item]')].indexOf(this) * ROW;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (top + ROW > list.scrollTop + VISIBLE) list.scrollTop = top + ROW - VISIBLE;
    };

    search('currency');
    for (let i = 0; i < 6; i++)
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    expect(list.scrollTop).toBeGreaterThan(0);

    search('currenc');
    // The list follows the selection in a MutationObserver callback, which runs in a microtask.
    await act(async () => {});

    const first = list.querySelector('[cmdk-item]');
    expect(first?.getAttribute('aria-selected')).toBe('true');
    expect(list.scrollTop).toBe(0);
  });

  it('puts the Send ICP action first for "send".', () => {
    openPalette();
    search('send');

    expect(optionNames()[0]).toBe('Send ICP');
  });

  it('changes the currency.', () => {
    openPalette();
    search('euro');

    fireEvent.click(screen.getByRole('option', { name: 'Show values in Euro (EUR)' }));

    expect(mocks.setFiatCurrency).toHaveBeenCalledWith(FiatCurrency.EUR);
  });

  it('changes the forecast period and reports the source.', () => {
    openPalette();
    search('forecast');

    fireEvent.click(screen.getByRole('option', { name: 'Forecast period: Week' }));

    expect(mocks.setForecastPeriod).toHaveBeenCalledWith(ForecastPeriod.Week);
    expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.ForecastPeriodChange, {
      period: ForecastPeriod.Week,
      source: 'command_palette',
    });
  });

  it.each([
    ['Receive ICP', { to: '/dashboard', search: { depositModal: true } }],
    ['Send ICP', { to: '/dashboard', search: { sendModal: true } }],
    ['Stake ICP', { to: '/neurons', search: { openWizard: true } }],
    ['Open address book', { to: '/settings', search: { openAddressBook: true } }],
  ])('opens the modal of "%s".', (label, expected) => {
    openPalette();

    fireEvent.click(screen.getByRole('option', { name: label }));

    expect(mocks.navigate).toHaveBeenCalledWith(expected);
  });

  it.each([
    ['Open proposals', ProposalFilter.Open],
    ['All proposals', ProposalFilter.All],
  ])('shows the proposal list of "%s".', (label, proposalFilter) => {
    openPalette();

    fireEvent.click(screen.getByRole('option', { name: label }));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/voting',
      search: { showProposals: true, proposalFilter },
    });
    expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.CommandPaletteSelect, {
      item: `proposals:${proposalFilter}`,
    });
  });

  it('finds the proposal lists by their keywords.', () => {
    openPalette();

    search('pending');
    expect(optionNames()[0]).toBe('Open proposals');

    search('history');
    expect(optionNames()[0]).toBe('All proposals');
  });

  it('opens the following modal when the user has neurons.', () => {
    mocks.neurons = [mockNeuron(LOCKED_ID, NeuronState.Locked)];
    openPalette();

    fireEvent.click(screen.getByRole('option', { name: 'Manage following' }));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/voting',
      search: { manageFollowing: true },
    });
  });

  it('disables the following command until the neurons load.', () => {
    mocks.neurons = undefined;
    openPalette();

    const option = screen.getByRole('option', { name: 'Manage following' });
    expect(option.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(option);

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(warningNotification).not.toHaveBeenCalled();
  });

  it('warns and stays on the page when the user has no neurons to follow with.', () => {
    openPalette();

    fireEvent.click(screen.getByRole('option', { name: 'Manage following' }));

    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(warningNotification).toHaveBeenCalledOnce();
  });

  describe('page commands', () => {
    const groupLabels = (heading: string) =>
      [
        ...(screen.getByText(heading).closest('[cmdk-group]')?.querySelectorAll('[cmdk-item]') ??
          []),
      ].map((item) => item.textContent);

    it('shows the copy commands first on each page.', () => {
      openPalette();

      expect(optionNames().slice(0, 2)).toEqual(['Copy ICP wallet address', 'Copy principal ID']);
      expect(screen.queryByRole('option', { name: 'Copy proposal link' })).toBeNull();
      expect(screen.queryByRole('option', { name: 'Back to proposals' })).toBeNull();
    });

    it('hides the copy commands without an identity.', () => {
      mocks.principal = undefined;
      openPalette();

      expect(screen.queryByText('This page')).toBeNull();
    });

    it('shows the proposal commands on a proposal page.', () => {
      mocks.proposalMatch = { params: { id: 144845n }, search: {} };
      openPalette();

      expect(groupLabels('This page')).toEqual([
        'Copy proposal link',
        'Back to proposals',
        'Copy ICP wallet address',
        'Copy principal ID',
      ]);
    });

    it('copies the proposal link without the search params.', async () => {
      mocks.proposalMatch = { params: { id: 144845n }, search: { proposalFilter: 'open' } };
      openPalette();

      fireEvent.click(screen.getByRole('option', { name: 'Copy proposal link' }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/voting/proposals/144845`,
      );
      await waitFor(() =>
        expect(successNotification).toHaveBeenCalledWith({
          description: 'Your proposal link was copied to the clipboard.',
        }),
      );
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('goes back to the proposal list with the current filter.', () => {
      mocks.proposalMatch = { params: { id: 144845n }, search: { proposalFilter: 'open' } };
      openPalette();

      fireEvent.click(screen.getByRole('option', { name: 'Back to proposals' }));

      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/voting',
        search: { showProposals: true, proposalFilter: 'open' },
      });
    });

    it('copies the account ID.', async () => {
      openPalette();

      fireEvent.click(screen.getByRole('option', { name: 'Copy ICP wallet address' }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        AccountIdentifier.fromPrincipal({ principal: Principal.fromText(PRINCIPAL) }).toHex(),
      );
      await waitFor(() =>
        expect(successNotification).toHaveBeenCalledWith({
          description: 'Your ICP wallet address was copied to the clipboard.',
        }),
      );
    });

    it('shows an error when the browser denies the copy.', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
      openPalette();

      fireEvent.click(screen.getByRole('option', { name: 'Copy principal ID' }));

      await waitFor(() => expect(errorNotification).toHaveBeenCalledOnce());
      expect(successNotification).not.toHaveBeenCalled();
    });

    it('copies the principal.', () => {
      openPalette();
      search('principal');

      fireEvent.click(screen.getByRole('option', { name: 'Copy principal ID' }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PRINCIPAL);
    });
  });
  it('disables the send command until the ICP ledger is ready.', () => {
    mocks.icpLedgerReady = false;
    openPalette();

    const option = screen.getByRole('option', { name: 'Send ICP' });
    expect(option.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(option);

    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('opens the add dialog of the Ledger devices with the feature on and WebHID.', () => {
    mocks.webHid = true;
    setLedgerFeature(true);
    openPalette();
    search('connect ledger');

    fireEvent.click(screen.getByRole('option', { name: 'Add Ledger device' }));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/settings',
      search: { addLedgerDevice: true },
    });
  });

  it.each([
    ['the browser has no WebHID', false, true],
    ['the Ledger device feature is off', true, false],
  ])('hides the Ledger command when %s.', (_, webHid, featureOn) => {
    mocks.webHid = webHid;
    setLedgerFeature(featureOn);
    openPalette();
    search('ledger');

    expect(screen.queryByRole('option', { name: 'Add Ledger device' })).toBeNull();
  });

  it('opens the Reports page.', () => {
    openPalette();
    search('csv');

    fireEvent.click(screen.getByRole('option', { name: 'Reports' }));

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/reports' });
  });

  it('keeps the results during the exit animation and starts empty on the next open.', () => {
    stubExitAnimation();
    storeRecent(['action:stake']);
    openPalette();
    search('csv');
    const results = optionNames();

    fireEvent.click(screen.getByRole('option', { name: 'Reports' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-state')).toBe('closed');
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'csv');
    expect(optionNames()).toEqual(results);

    // jsdom has no `AnimationEvent`.
    fireEvent(dialog, Object.assign(new Event('animationend'), { animationName: 'exit' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    togglePalette();

    expect(screen.getByRole('combobox')).toHaveProperty('value', '');
    expect(recentNames()).toEqual(['Reports', 'Stake ICP']);
  });

  it('ignores a selection during the exit animation.', () => {
    stubExitAnimation();
    openPalette();
    search('euro');
    const input = screen.getByRole('combobox');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closed');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: 'Show values in Euro (EUR)' }));

    expect(mocks.setFiatCurrency).not.toHaveBeenCalled();
    expect(analytics.event).not.toHaveBeenCalledWith(
      AnalyticsEvent.CommandPaletteSelect,
      expect.anything(),
    );
    expect(storedRecent()).toEqual([]);
  });

  describe('neuron commands', () => {
    beforeEach(() => {
      mocks.neurons = [
        mockNeuron(LOCKED_ID, NeuronState.Locked),
        mockNeuron(DISSOLVING_ID, NeuronState.Dissolving),
      ];
    });

    it('shows the neuron commands only while the user searches.', () => {
      openPalette();

      expect(optionNames().some((name) => name.includes('Neuron 16641...49305'))).toBe(false);
    });

    it('lists the dissolve command that applies to each neuron.', () => {
      openPalette();
      search('dissolve');

      expect(optionNames()).toContain('Start dissolving Neuron 16641...49305');
      expect(optionNames()).toContain('Stop dissolving Neuron 73310...58442');
      expect(optionNames()).not.toContain('Stop dissolving Neuron 16641...49305');
      expect(optionNames()).not.toContain('Start dissolving Neuron 73310...58442');
      expect(optionNames().some((name) => name.startsWith('Increase delay'))).toBe(false);
    });

    it('finds the commands of a neuron by its ID.', () => {
      openPalette();
      search(LOCKED_ID.toString());

      const names = optionNames();
      expect(names).toContain('Open neuron Neuron 16641...49305');
      expect(names).toContain('Top up neuron Neuron 16641...49305');
      expect(names.some((name) => name.includes('73310...58442'))).toBe(false);
    });

    it('opens the dialog of the neuron action and reports no neuron ID.', () => {
      openPalette();
      search('dissolve');

      fireEvent.click(
        screen.getByRole('option', { name: 'Start dissolving Neuron 16641...49305' }),
      );

      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/neurons',
        search: { neuronId: LOCKED_ID.toString(), action: 'dissolve' },
      });
      expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.CommandPaletteSelect, {
        item: 'neuron:startDissolving',
      });
    });

    it('opens the neuron summary.', () => {
      openPalette();
      search(DISSOLVING_ID.toString());

      fireEvent.click(screen.getByRole('option', { name: 'Open neuron Neuron 73310...58442' }));

      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/neurons',
        search: { neuronId: DISSOLVING_ID.toString(), action: undefined },
      });
    });
  });

  describe('Recent group', () => {
    it('does not show before the user runs a command.', () => {
      openPalette();

      expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
    });

    it('shows the last three commands first, the last one on top.', () => {
      openPalette();
      for (const label of ['Receive ICP', 'Stake ICP', 'Open address book', 'Hide balances']) {
        fireEvent.click(screen.getByRole('option', { name: label }));
        togglePalette();
      }

      // The balances toggle shows its label for the current state.
      expect(recentNames()).toEqual(['Show balances', 'Open address book', 'Stake ICP']);
      expect(optionNames().slice(0, 3)).toEqual(recentNames());
      expect(storedRecent()).toEqual([
        'toggle-balances',
        'action:addressBook',
        'action:stake',
        'action:receive',
      ]);
    });

    it('shows a search-only command and its checkmark, and drops ids with no command.', () => {
      storeRecent(['nav:/gone', 'currency:USD', 'feature:unknown', 'theme:dark']);
      openPalette();

      expect(recentNames()).toEqual(['Show values in US Dollar (USD)', 'Dark theme']);
      const currency = within(screen.getByRole('group', { name: 'Recent' })).getByRole('option', {
        name: 'Show values in US Dollar (USD)',
      });
      expect(currency.querySelector('.lucide-check')).not.toBeNull();
    });

    it('shows the recent commands when the search button opens the palette.', async () => {
      storeRecent(['action:stake']);
      render(
        <>
          <CommandPaletteButton variant="header" />
          <CommandPalette />
        </>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Search' }));

      expect(recentNames()).toEqual(['Stake ICP']);
    });

    it('hides while the user searches.', () => {
      storeRecent(['action:stake']);
      openPalette();
      expect(recentNames()).toEqual(['Stake ICP']);

      search('stake');

      expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
      expect(optionNames().filter((name) => name === 'Stake ICP')).toHaveLength(1);
    });

    it('runs the command and reports the recent source.', () => {
      storeRecent(['action:stake']);
      openPalette();

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Recent' })).getByRole('option', {
          name: 'Stake ICP',
        }),
      );

      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/neurons', search: { openWizard: true } });
      expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.CommandPaletteSelect, {
        item: 'action:stake',
        source: 'recent',
      });
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('keeps its items in place while the palette stays open.', () => {
      openPalette();

      fireEvent.click(screen.getByRole('option', { name: 'Dark theme' }));

      expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
      togglePalette();
      togglePalette();
      expect(recentNames()).toEqual(['Dark theme']);
    });

    it('does not keep a proposal ID or sign out.', () => {
      openPalette();
      search('123');
      fireEvent.click(screen.getByRole('option', { name: 'Go to proposal #123' }));
      togglePalette();
      fireEvent.click(screen.getByRole('option', { name: 'Sign out' }));

      expect(storedRecent()).toEqual([]);
    });

    it('does not keep or show a page command.', () => {
      mocks.proposalMatch = { params: { id: 144845n }, search: {} };
      storeRecent(['back:proposals', 'action:stake']);
      openPalette();

      expect(recentNames()).toEqual(['Stake ICP']);

      fireEvent.click(screen.getByRole('option', { name: 'Back to proposals' }));

      expect(storedRecent()).toEqual(['back:proposals', 'action:stake']);
    });
  });

  describe('shortcut hints', () => {
    const shortcuts = () =>
      Object.fromEntries(
        screen
          .queryAllByRole('option')
          .filter((option) => option.hasAttribute('aria-keyshortcuts'))
          .map((option) => [
            option.getAttribute('aria-keyshortcuts'),
            option.querySelector('span')?.textContent,
          ]),
      );

    beforeEach(() => {
      localStorage.setItem(SHORTCUTS_SETTINGS_KEY, 'true');
    });

    it('shows each key on the item that does the same thing.', () => {
      localStorage.setItem(THEME_STORAGE_KEY, Theme.System);
      openPalette();

      expect(shortcuts()).toEqual({ d: 'Dark theme', p: 'Hide balances', u: 'Sign out' });
      expect(
        screen.getByRole('option', { name: 'Dark theme' }).querySelector('kbd')?.textContent,
      ).toBe('d');
    });

    it('shows the theme key on the light theme when the theme is dark.', () => {
      localStorage.setItem(THEME_STORAGE_KEY, Theme.Dark);
      openPalette();

      expect(shortcuts().d).toBe('Light theme');
    });

    it('shows the hints when the user turns the shortcuts on.', () => {
      localStorage.setItem(SHORTCUTS_SETTINGS_KEY, 'false');
      openPalette();
      expect(shortcuts()).toEqual({});

      fireEvent.click(screen.getByRole('option', { name: 'Keyboard shortcuts' }));

      expect(Object.keys(shortcuts())).toEqual(['d', 'p', 'u']);
    });

    it('shows no hints on a touch screen.', () => {
      mocks.finePointer = false;
      openPalette();

      expect(shortcuts()).toEqual({});
      expect(document.querySelector('[cmdk-list] kbd')).toBeNull();
    });
  });
});
