import '@/i18n/config';

import type { Neuron, NeuronInfo } from '@icp-sdk/canisters/nns';
import { Topic } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { SECONDS_IN_DAY } from '@constants/extra';
import { nowInSeconds } from '@utils/date';
import { errorNotification, successNotification } from '@utils/notification';
import { mockNeuron } from '@fixtures/neuron';

import { AutomaticVotingCard } from './AutomaticVotingCard';

// ─── Module mocks ────────────────────────────────────────────────

const { USER, ECONOMICS, economicsState, refreshVotingPower } = vi.hoisted(() => ({
  USER: 'user-principal',
  // Decay starts 180 days after the last refresh, and following is cleared 30 days later.
  ECONOMICS: {
    startReducingVotingPowerAfterSeconds: BigInt(180 * 86_400),
    clearFollowingAfterSeconds: BigInt(30 * 86_400),
  },
  economicsState: { loaded: true },
  refreshVotingPower: vi.fn(),
}));

vi.mock('ic-use-internet-identity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => USER }) },
  }),
}));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { refreshVotingPower } }),
}));

vi.mock('@hooks/governance/useGovernanceEconomics', () => ({
  useGovernanceEconomics: () =>
    economicsState.loaded
      ? { data: { response: { votingPowerEconomics: ECONOMICS } }, isLoading: false }
      : { data: undefined, isLoading: true },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, unknown>;
    children: ReactNode;
  }) => (
    <a href={`${to}?${new URLSearchParams(search as Record<string, string>)}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@utils/notification', () => ({
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const ALL_TOPICS = [
  Topic.Unspecified,
  Topic.Governance,
  Topic.SnsAndCommunityFund,
  Topic.NetworkEconomics,
  Topic.ExchangeRate,
];

const daysAgo = (days: number) => BigInt(nowInSeconds() - days * SECONDS_IN_DAY);

const neuron = ({
  id,
  refreshedDaysAgo = 10,
  topics = ALL_TOPICS,
  fullNeuron = { controller: USER },
}: {
  id: bigint;
  refreshedDaysAgo?: number;
  topics?: Topic[];
  fullNeuron?: Partial<Neuron>;
}) =>
  mockNeuron({
    neuronId: id,
    votingPowerRefreshedTimestampSeconds: daysAgo(refreshedDaysAgo),
    fullNeuron: {
      id,
      followees: topics.map((topic) => ({ topic, followees: [27n] })),
      ...fullNeuron,
    },
  });

const hotkeyFullNeuron = { controller: 'other-principal', hotKeys: [USER] };

const renderCard = (neurons: NeuronInfo[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AutomaticVotingCard neurons={neurons} />
    </QueryClientProvider>,
  );

const card = () => screen.getByTestId('stakes-summary-automatic-voting-card');
const byTestId = (id: string) => screen.queryByTestId(id);

describe('AutomaticVotingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(analytics, 'event');
    economicsState.loaded = true;
    refreshVotingPower.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves to the next phase while the card stays mounted', () => {
    vi.useFakeTimers();
    // 30 seconds before the 30-day warning window starts.
    renderCard([neuron({ id: 1n, refreshedDaysAgo: 150 - 30 / SECONDS_IN_DAY })]);

    expect(card().dataset.phase).toBe('active');

    act(() => vi.advanceTimersByTime(60_000));

    expect(card().dataset.phase).toBe('confirmSoon');
  });

  it('shows the due date, the window left, and "Confirm" when all neurons are healthy', async () => {
    const user = userEvent.setup();
    renderCard([neuron({ id: 1n, refreshedDaysAgo: 45 }), neuron({ id: 2n })]);

    expect(card().dataset.phase).toBe('active');
    expect(card().textContent).toContain('Due in 135 days');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75');

    await user.click(byTestId('automatic-voting-confirm-btn')!);

    expect(refreshVotingPower).toHaveBeenCalledTimes(2);
    expect(successNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Following confirmed for 2 of your neurons.',
    });
  });

  it('confirms controlled and hotkey neurons with one success toast when a neuron loses rewards', async () => {
    const user = userEvent.setup();
    renderCard([
      neuron({ id: 1n }),
      neuron({ id: 2n, refreshedDaysAgo: 190 }),
      neuron({ id: 3n, refreshedDaysAgo: 190, fullNeuron: hotkeyFullNeuron }),
      neuron({ id: 4n, refreshedDaysAgo: 190, fullNeuron: { controller: 'other-principal' } }),
    ]);

    expect(card().dataset.phase).toBe('losingRewards');
    expect(card().textContent).toContain('Overdue');
    expect(card().textContent).toContain('Stops in 20 days');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('67');

    await user.click(byTestId('automatic-voting-confirm-btn')!);

    expect(refreshVotingPower).toHaveBeenCalledTimes(3);
    expect(refreshVotingPower).toHaveBeenCalledWith({ neuronId: 3n });
    expect(refreshVotingPower).not.toHaveBeenCalledWith({ neuronId: 4n });
    expect(successNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Following confirmed for 3 of your neurons.',
    });
    expect(errorNotification).not.toHaveBeenCalled();
  });

  it('shows "Confirm" when a neuron is close to decay', () => {
    renderCard([neuron({ id: 1n, refreshedDaysAgo: 163 })]);

    expect(card().dataset.phase).toBe('confirmSoon');
    expect(card().textContent).toContain('Due soon');
    expect(card().textContent).toContain('Rewards drop in 17 days');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('9');
    expect(byTestId('automatic-voting-confirm-btn')).toBeTruthy();
  });

  it('shows no action and no countdown when the user cannot confirm any neuron', () => {
    renderCard([neuron({ id: 1n, fullNeuron: { controller: 'other-principal' } })]);

    expect(card().dataset.phase).toBe('active');
    expect(card().textContent).toContain('Enabled');
    expect(byTestId('automatic-voting-confirm-btn')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows one error toast with the count when some calls fail', async () => {
    refreshVotingPower.mockImplementation(({ neuronId }: { neuronId: bigint }) =>
      neuronId === 2n ? Promise.reject(new Error('Canister is down')) : Promise.resolve(),
    );
    const user = userEvent.setup();
    renderCard([neuron({ id: 1n }), neuron({ id: 2n, refreshedDaysAgo: 190 }), neuron({ id: 3n })]);

    await user.click(byTestId('automatic-voting-confirm-btn')!);

    expect(errorNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Failed to confirm following for 1 of 3 neurons. Please try again.',
    });
    expect(successNotification).not.toHaveBeenCalled();
    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(
      AnalyticsEvent.StakingRefreshVotingPowerAllError,
      { neuron_count: '3', failed_count: '1', reason: 'unknown' },
    );
  });

  it('shows the error of the first call when all calls fail', async () => {
    refreshVotingPower.mockRejectedValue(new Error('Canister is down'));
    const user = userEvent.setup();
    renderCard([neuron({ id: 1n, refreshedDaysAgo: 190 })]);

    await user.click(byTestId('automatic-voting-confirm-btn')!);

    expect(errorNotification).toHaveBeenCalledExactlyOnceWith({
      description: 'Canister is down',
    });
  });

  it.each([
    { phase: 'notSetUp', title: 'Not set up', neurons: () => [neuron({ id: 1n, topics: [] })] },
    {
      phase: 'followingCleared',
      title: 'Stopped',
      neurons: () => [neuron({ id: 1n, refreshedDaysAgo: 215 }), neuron({ id: 2n })],
    },
  ])('links "Set up" to the following setup in the $phase phase', ({ phase, title, neurons }) => {
    renderCard(neurons());

    expect(card().dataset.phase).toBe(phase);
    expect(card().textContent).toContain(title);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(byTestId('automatic-voting-set-up-btn')?.getAttribute('href')).toBe(
      '/voting?manageFollowing=true',
    );
    expect(byTestId('automatic-voting-confirm-btn')).toBeNull();
  });

  it('links to the known neuron selection when coverage is partial', () => {
    renderCard([neuron({ id: 1n, topics: [Topic.Governance] })]);

    expect(card().dataset.phase).toBe('partial');
    expect(byTestId('automatic-voting-select-neuron-link')).toBeTruthy();
  });

  it('shows a skeleton and no action while the economics load', () => {
    economicsState.loaded = false;
    renderCard([neuron({ id: 1n, refreshedDaysAgo: 190 })]);

    expect(card().dataset.phase).toBeUndefined();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(byTestId('automatic-voting-confirm-btn')).toBeNull();
  });
});
