import '@/i18n/config';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { mockNeuron } from '@fixtures/neuron';

import { ApyOptimizationModal } from './ApyOptimizationModal';

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

vi.mock('@hooks/useApyColor', () => ({ useApyColor: () => ({ ready: false }) }));

vi.mock('@hooks/useStakingRewards', () => ({
  useStakingRewards: () => ({
    loading: false,
    apy: { cur: 0.07, max: 0.14, neurons: new Map() },
    stakingFlowApyPreview: {
      [ICP_MAX_DISSOLVE_DELAY_SECONDS]: { autoStake: { locked: 0.14 } },
    },
  }),
}));

vi.mock('@hooks/governance', () => ({
  useGovernanceNeurons: () => ({
    data: { response: [mockNeuron({ neuronId: 7n })] },
    isLoading: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, ...props }: ComponentProps<'a'> & { to: string; search: object }) => (
    <a href={`${to}?${new URLSearchParams(search as Record<string, string>)}`} {...props} />
  ),
}));

describe('ApyOptimizationModal', () => {
  it('opens from a custom trigger', async () => {
    render(<ApyOptimizationModal trigger={<button type="button">Increase</button>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Increase' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes when the user opens a neuron to maximize it', async () => {
    render(<ApyOptimizationModal trigger={<button type="button">Increase</button>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Increase' }));
    const maximize = screen.getByRole('link', { name: 'Maximize' });
    expect(maximize.getAttribute('href')).toBe('/neurons?neuronId=7');

    await userEvent.click(maximize);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
