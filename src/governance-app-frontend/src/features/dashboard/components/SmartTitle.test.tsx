import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { APY_PLACEHOLDER, SmartTitle } from './SmartTitle';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('@hooks/governance', () => ({
  useGovernanceNeurons: () => ({ isLoading: false, data: { response: [] } }),
}));

vi.mock('@hooks/icpLedger', () => ({
  useIcpLedgerAccountBalance: () => ({ isLoading: false, data: { response: 0n } }),
}));

vi.mock('@hooks/useStakingRewards', () => ({ useStakingRewards: () => ({ loading: true }) }));

describe('SmartTitle', () => {
  it('shows a placeholder without breakable hyphens while the APY loads', () => {
    render(<SmartTitle />);

    expect(APY_PLACEHOLDER).not.toContain('-');
    expect(screen.getByText(`${APY_PLACEHOLDER} per year`)).toBeTruthy();
  });
});
