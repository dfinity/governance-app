import '@/i18n/config';

import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { COMMAND_PALETTE_RECENT_STORAGE_KEY } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
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
  });
});
