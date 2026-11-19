import '@/i18n/config';

import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { ProposalFilter } from '@features/proposals/utils';

import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { errorNotification, successNotification, warningNotification } from '@utils/notification';

import { CommandPalette } from './CommandPalette';

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
  icpLedgerReady: true,
  webHid: false,
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
    mocks.proposalMatch = undefined;
    mocks.principal = Principal.fromText(PRINCIPAL);
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
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
});
