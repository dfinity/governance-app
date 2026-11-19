import '@/i18n/config';

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { ProposalFilter } from '@features/proposals/utils';

import { SHORTCUTS_SETTINGS_KEY, THEME_STORAGE_KEY } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { Theme } from '@constants/theme';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { warningNotification } from '@utils/notification';

import { CommandPalette } from './CommandPalette';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  openPalette: undefined as (() => void) | undefined,
  neurons: [] as unknown[] | undefined,
  setFiatCurrency: vi.fn(),
  setForecastPeriod: vi.fn(),
  finePointer: true,
  icpLedgerReady: true,
  webHid: false,
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }));

vi.mock('@hooks/useCommandPaletteShortcut', () => ({
  useCommandPaletteShortcut: (onTrigger: () => void) => {
    mocks.openPalette = onTrigger;
  },
}));

vi.mock('@hooks/governance', () => ({
  useGovernanceNeurons: () => ({ data: mocks.neurons && { response: mocks.neurons } }),
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

vi.mock('@utils/notification', () => ({ warningNotification: vi.fn() }));

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

const search = (query: string) =>
  fireEvent.change(screen.getByRole('combobox'), { target: { value: query } });

const optionNames = () =>
  screen
    .queryAllByRole('option')
    .filter((option) => option.getAttribute('aria-disabled') !== 'true')
    .map((option) => option.textContent ?? '');

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
    mocks.finePointer = true;
    mocks.icpLedgerReady = true;
    mocks.webHid = false;
  });

  afterEach(() => setLedgerFeature(false));

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
    mocks.neurons = [{}];
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
