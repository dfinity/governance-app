import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EngagementResult } from '@features/stakes/utils/calculateEngagement';

import { mockNeuron } from '@fixtures/neuron';

import { EngagementCard } from './EngagementCard';

const { engagementState } = vi.hoisted(() => ({
  engagementState: {
    engagement: null as EngagementResult,
    isLoading: true,
  },
}));

vi.mock('@features/stakes/hooks/useNeuronEngagement', () => ({
  useNeuronEngagement: () => ({ ...engagementState, isError: false }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: { id: bigint };
    search?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={`${params ? to.replace('$id', params.id.toString()) : to}?${new URLSearchParams(search)}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

const setEngagement = (rate: number, voted: boolean[]) => {
  engagementState.isLoading = false;
  engagementState.engagement = {
    rate,
    proposals: voted.map((v, index) => ({ proposalId: BigInt(index + 1), voted: v })),
  };
};

describe('EngagementCard', () => {
  beforeEach(() => {
    engagementState.isLoading = true;
    engagementState.engagement = null;
  });

  it('tells the user how the participation rate is calculated', () => {
    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(
      screen.getByRole('button', {
        name: 'Participation rate Based on recent proposals that still accept votes',
      }),
    ).toBeTruthy();
  });

  it('shows a whole rate without decimals when each proposal has a vote', () => {
    setEngagement(1, [true, true, true]);

    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All caught up' }).getAttribute('href')).toBe(
      '/voting?showProposals=true&proposalFilter=all',
    );
  });

  it('rounds the rate down, so a missing vote never shows as 100%', () => {
    setEngagement(0.9996, [true, false]);

    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(screen.getByText('99.9%')).toBeTruthy();
  });

  it('links to the proposal when one proposal waits for a vote', () => {
    setEngagement(2 / 3, [true, false, true]);

    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(screen.getByRole('link', { name: '1 to vote' }).getAttribute('href')).toBe(
      '/voting/proposals/2?',
    );
  });

  it('links to the proposals when more than one proposal waits for a vote', () => {
    setEngagement(1 / 3, [false, true, false]);

    render(<EngagementCard neurons={[mockNeuron()]} />);

    expect(screen.getByRole('link', { name: '2 to vote' }).getAttribute('href')).toBe(
      '/voting?showProposals=true&proposalFilter=all',
    );
  });

  it('shows one strip segment for each proposal, from the oldest to the newest', () => {
    setEngagement(2 / 3, [true, false, true]);

    render(<EngagementCard neurons={[mockNeuron()]} />);

    const segments = [...screen.getByTestId('engagement-card-strip').children];
    expect(segments.map((segment) => segment.getAttribute('data-voted'))).toEqual([
      'true',
      'false',
      'true',
    ]);
  });
});
