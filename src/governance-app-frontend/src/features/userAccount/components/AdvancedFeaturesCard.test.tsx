import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADVANCED_FEATURES_DEFAULTS } from '@typings/advancedFeatures';

import { AdvancedFeaturesCard } from './AdvancedFeaturesCard';

const mocks = vi.hoisted(() => ({
  advancedFeatures: vi.fn(),
  isWebHidSupported: vi.fn(),
}));

vi.mock('@hooks/useAdvancedFeatures', () => ({ useAdvancedFeatures: mocks.advancedFeatures }));
vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: mocks.isWebHidSupported }));

describe('AdvancedFeaturesCard', () => {
  beforeEach(() => {
    mocks.advancedFeatures.mockReturnValue({
      features: ADVANCED_FEATURES_DEFAULTS,
      setFeature: vi.fn(),
    });
  });

  it('shows the Ledger device row when the browser has WebHID', () => {
    mocks.isWebHidSupported.mockReturnValue(true);

    render(<AdvancedFeaturesCard />);

    expect(screen.getByTestId('advanced-feature-toggle-ledgerDevice')).toBeTruthy();
    expect(screen.getByText('Ledger device')).toBeTruthy();
  });

  it('hides the Ledger device row without WebHID and keeps the other rows', () => {
    mocks.isWebHidSupported.mockReturnValue(false);

    render(<AdvancedFeaturesCard />);

    expect(screen.queryByTestId('advanced-feature-toggle-ledgerDevice')).toBeNull();
    expect(screen.getByTestId('advanced-feature-toggle-subaccounts')).toBeTruthy();
    expect(screen.getByTestId('advanced-feature-toggle-transactionMemo')).toBeTruthy();
  });
});
