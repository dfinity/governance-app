import '@/i18n/config';

import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
import { ProposalFilter } from '@features/proposals/utils';

import { FiatCurrency } from '@constants/fiat';
import { ForecastPeriod } from '@constants/forecast';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { warningNotification } from '@utils/notification';

import { CommandPalette } from './CommandPalette';

const USER = 'user-principal';
const LOCKED_ID = 1664112345678949305n;
const DISSOLVING_ID = 7331012345678958442n;

const mockNeuron = (neuronId: bigint, state: NeuronState): NeuronInfo =>
  ({
    neuronId,
    state,
    dissolveDelaySeconds: 0n,
    fullNeuron: { controller: USER, hotKeys: [], cachedNeuronStake: 1n, neuronFees: 0n },
  }) as unknown as NeuronInfo;

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

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: { getPrincipal: () => ({ toText: () => USER }) } }),
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
});
