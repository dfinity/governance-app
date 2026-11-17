import '@/i18n/config';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY,
  WELCOME_MODAL_STORAGE_KEY,
} from '@constants/extra';
import {
  ADVANCED_FEATURES_DEFAULTS,
  AdvancedFeature,
  type AdvancedFeaturesSettings,
} from '@typings/advancedFeatures';

import { NewFeatureModal } from './NewFeatureModal';

const mocks = vi.hoisted(() => ({
  advancedFeatures: vi.fn(),
  setFeature: vi.fn(),
  detect: vi.fn(),
  notify: vi.fn(),
  isLoginHandoffActive: vi.fn(),
}));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: () => true }));
vi.mock('@hooks/useAdvancedFeatures', () => ({ useAdvancedFeatures: mocks.advancedFeatures }));
vi.mock('@hooks/useDetectAdvancedFeatures', () => ({ useDetectAdvancedFeatures: mocks.detect }));
vi.mock('@utils/advancedFeatures', () => ({ notifyAdvancedFeatureChange: mocks.notify }));
vi.mock('@common/auth/loginHandoff', () => ({
  useIsLoginHandoffActive: mocks.isLoginHandoffActive,
}));

/** An in-memory `localStorage`: the one of the test environment has no `setItem`. */
const createStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    items,
  };
};

const mockFeatures = ({
  features = {},
  missing = [],
}: {
  features?: Partial<AdvancedFeaturesSettings>;
  missing?: AdvancedFeature[];
} = {}) =>
  mocks.advancedFeatures.mockReturnValue({
    features: { ...ADVANCED_FEATURES_DEFAULTS, ...features },
    setFeature: mocks.setFeature,
    missingFeatureKeys: missing,
  });

const seenAnnouncements = (storage: ReturnType<typeof createStorage>) =>
  JSON.parse(storage.items.get(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY) ?? '[]');

describe('NewFeatureModal', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createStorage();
    storage.items.set(WELCOME_MODAL_STORAGE_KEY, 'true');
    vi.stubGlobal('localStorage', storage);
    mockFeatures();
    mocks.detect.mockReturnValue({ isDetecting: false, detectedFeatures: {}, error: undefined });
    mocks.isLoginHandoffActive.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('presents an unseen feature to a returning user and turns it on', async () => {
    mocks.detect.mockReturnValue({
      isDetecting: false,
      detectedFeatures: { [AdvancedFeature.LedgerDevice]: true },
      error: undefined,
    });
    render(<NewFeatureModal />);

    expect((await screen.findByTestId('new-feature-modal')).textContent).toContain('Ledger device');
    expect(screen.getByTestId('new-feature-detected').textContent).toBe(
      'A Ledger device is registered on your account.',
    );
    expect(mocks.detect).toHaveBeenCalledWith([AdvancedFeature.LedgerDevice]);

    await userEvent.click(screen.getByTestId('new-feature-turn-on-btn'));

    expect(mocks.setFeature).toHaveBeenCalledWith(AdvancedFeature.LedgerDevice, true);
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.any(Function),
      AdvancedFeature.LedgerDevice,
      true,
    );
    expect(seenAnnouncements(storage)).toEqual([AdvancedFeature.LedgerDevice]);
    await waitFor(() => expect(screen.queryByTestId('new-feature-modal')).toBeNull());
  });

  it('leaves a stored choice as it is on "Not now"', async () => {
    render(<NewFeatureModal />);

    expect(screen.queryByTestId('new-feature-detected')).toBeNull();
    await userEvent.click(await screen.findByTestId('new-feature-not-now-btn'));

    expect(mocks.setFeature).not.toHaveBeenCalled();
    expect(seenAnnouncements(storage)).toEqual([AdvancedFeature.LedgerDevice]);
    await waitFor(() => expect(screen.queryByTestId('new-feature-modal')).toBeNull());
  });

  it('stores the feature as off on "Not now" when it has no stored value', async () => {
    mockFeatures({ missing: [AdvancedFeature.LedgerDevice] });
    render(<NewFeatureModal />);

    await userEvent.click(await screen.findByTestId('new-feature-not-now-btn'));

    expect(mocks.setFeature).toHaveBeenCalledWith(AdvancedFeature.LedgerDevice, false);
  });

  it('waits for the detection and the login frame', () => {
    mocks.detect.mockReturnValue({ isDetecting: true, detectedFeatures: {}, error: undefined });
    const { rerender } = render(<NewFeatureModal />);
    expect(screen.queryByTestId('new-feature-modal')).toBeNull();

    mocks.detect.mockReturnValue({ isDetecting: false, detectedFeatures: {}, error: undefined });
    mocks.isLoginHandoffActive.mockReturnValue(true);
    rerender(<NewFeatureModal />);
    expect(screen.queryByTestId('new-feature-modal')).toBeNull();
  });

  it('shows nothing to a new user', () => {
    storage.items.delete(WELCOME_MODAL_STORAGE_KEY);
    render(<NewFeatureModal />);

    expect(screen.queryByTestId('new-feature-modal')).toBeNull();
    expect(mocks.detect).toHaveBeenCalledWith([]);
  });

  it('shows nothing for a feature the user saw', () => {
    storage.items.set(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY, '["ledgerDevice"]');
    render(<NewFeatureModal />);

    expect(screen.queryByTestId('new-feature-modal')).toBeNull();
  });

  it('marks a feature that is already on as seen, with no modal', () => {
    mockFeatures({ features: { [AdvancedFeature.LedgerDevice]: true } });
    render(<NewFeatureModal />);

    expect(screen.queryByTestId('new-feature-modal')).toBeNull();
    expect(seenAnnouncements(storage)).toEqual([AdvancedFeature.LedgerDevice]);
  });
});
