import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { EngagementCard } from './EngagementCard';

vi.mock('@features/stakes/hooks/useNeuronEngagement', () => ({
  useNeuronEngagement: () => ({ engagement: null, isLoading: true, isError: false }),
}));

describe('EngagementCard', () => {
  it('tells the user how the participation rate is calculated', () => {
    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(
      screen.getByRole('button', { name: 'Participation rate Based on the last 50 proposals' }),
    ).toBeTruthy();
  });
});
