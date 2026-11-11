import '@/i18n/config';

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { AdvancedFeature } from '@typings/advancedFeatures';

import { useNewFeatureCheck } from './useNewFeatureCheck';

const mocks = vi.hoisted(() => ({
  missingFeatureKeys: [] as string[],
  setFeature: vi.fn(),
  detect: vi.fn(),
  infoNotification: vi.fn(),
}));

vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: () => true }));
vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({
    setFeature: mocks.setFeature,
    missingFeatureKeys: mocks.missingFeatureKeys,
  }),
}));
vi.mock('@hooks/useDetectAdvancedFeatures', () => ({ useDetectAdvancedFeatures: mocks.detect }));
vi.mock('@utils/notification', () => ({ infoNotification: mocks.infoNotification }));

describe('useNewFeatureCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.missingFeatureKeys = [AdvancedFeature.TransactionMemo, AdvancedFeature.LedgerDevice];
    const items = new Map([[WELCOME_MODAL_STORAGE_KEY, 'true']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    });
    mocks.detect.mockReturnValue({
      isDetecting: false,
      detectedFeatures: { [AdvancedFeature.TransactionMemo]: false },
      error: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves a feature with a modal to the modal', () => {
    renderHook(() => useNewFeatureCheck());

    expect(mocks.detect).toHaveBeenCalledWith([AdvancedFeature.TransactionMemo]);
    expect(mocks.setFeature).toHaveBeenCalledTimes(1);
    expect(mocks.setFeature).toHaveBeenCalledWith(AdvancedFeature.TransactionMemo, false);
    expect(mocks.infoNotification).not.toHaveBeenCalled();
  });

  it('keeps the check when another feature is written during the detection', () => {
    mocks.detect.mockReturnValue({ isDetecting: true, detectedFeatures: {}, error: undefined });
    const { rerender } = renderHook(() => useNewFeatureCheck());

    // The modal turns on a feature, which stores all of them.
    mocks.missingFeatureKeys = [];
    mocks.detect.mockReturnValue({
      isDetecting: false,
      detectedFeatures: { [AdvancedFeature.TransactionMemo]: true },
      error: undefined,
    });
    rerender();

    expect(mocks.detect).toHaveBeenLastCalledWith([AdvancedFeature.TransactionMemo]);
    expect(mocks.infoNotification).toHaveBeenCalledTimes(1);
    expect(mocks.setFeature).not.toHaveBeenCalled();
  });
});
