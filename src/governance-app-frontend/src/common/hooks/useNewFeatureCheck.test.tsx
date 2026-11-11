import '@/i18n/config';

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { AdvancedFeature } from '@typings/advancedFeatures';

import { useNewFeatureCheck } from './useNewFeatureCheck';

const mocks = vi.hoisted(() => ({
  setFeature: vi.fn(),
  detect: vi.fn(),
  infoNotification: vi.fn(),
}));

vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: () => true }));
vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({
    setFeature: mocks.setFeature,
    missingFeatureKeys: [AdvancedFeature.TransactionMemo, AdvancedFeature.LedgerDevice],
  }),
}));
vi.mock('@hooks/useDetectAdvancedFeatures', () => ({ useDetectAdvancedFeatures: mocks.detect }));
vi.mock('@utils/notification', () => ({ infoNotification: mocks.infoNotification }));

describe('useNewFeatureCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
