import '@/i18n/config';

import { type KnownNeuron, type NeuronInfo, Topic } from '@icp-sdk/canisters/nns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DIALOG_RESET_DELAY_MS } from '@constants/extra';

import { SimpleFollowingModal } from './SimpleFollowingModal';

// ─── Module mocks ────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  setFollowing: vi.fn(),
  userNeurons: [] as NeuronInfo[],
  knownNeurons: [] as KnownNeuron[],
}));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { setFollowing: mocks.setFollowing } }),
  useGovernanceNeurons: () => ({ data: { certified: true, response: mocks.userNeurons } }),
}));

vi.mock('@hooks/governance/useGovernanceKnownNeurons', () => ({
  useGovernanceKnownNeurons: () => ({
    data: { certified: true, response: mocks.knownNeurons },
    isLoading: false,
  }),
}));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

// ─── Helpers ─────────────────────────────────────────────────────

const knownNeuron = (id: bigint, name: string) => ({ id, name }) as KnownNeuron;

const neuronFollowing = (followee: bigint) =>
  ({
    neuronId: 1n,
    fullNeuron: { followees: [{ topic: Topic.Governance, followees: [followee] }] },
  }) as NeuronInfo;

const setup = () => {
  mocks.knownNeurons = [knownNeuron(101n, 'Alpha'), knownNeuron(102n, 'Beta')];
  mocks.userNeurons = [neuronFollowing(101n)];

  const client = new QueryClient();
  const modal = (open: boolean) => (
    <QueryClientProvider client={client}>
      <SimpleFollowingModal open={open} onOpenChange={() => {}} />
    </QueryClientProvider>
  );
  const { rerender } = render(modal(true));

  return {
    reopenBeforeReset: () => {
      rerender(modal(false));
      act(() => {
        vi.advanceTimersByTime(DIALOG_RESET_DELAY_MS - 1);
      });
      rerender(modal(true));
    },
  };
};

const searchInput = () => screen.getByPlaceholderText<HTMLInputElement>(/search/i);

const findConfirmButton = () => screen.findByRole('button', { name: 'Confirm' });

describe('SimpleFollowingModal', () => {
  afterEach(() => {
    vi.useRealTimers();
    mocks.setFollowing.mockReset();
  });

  it('clears the search when it reopens before the delayed reset', () => {
    vi.useFakeTimers();
    const { reopenBeforeReset } = setup();

    fireEvent.change(searchInput(), { target: { value: 'Beta' } });
    expect(screen.queryByText('Alpha')).toBeNull();

    reopenBeforeReset();

    expect(searchInput().value).toBe('');
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('leaves the confirmation when it reopens before the delayed reset', async () => {
    const { reopenBeforeReset } = setup();

    fireEvent.click(screen.getByText('Beta'));
    await findConfirmButton();

    vi.useFakeTimers();
    reopenBeforeReset();
    vi.useRealTimers();

    // The list replaces the confirmation only after the exit animation.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull());
  });

  it('keeps the state of a follow in progress while it stays open', async () => {
    mocks.setFollowing.mockReturnValue(new Promise(() => undefined));
    setup();

    fireEvent.click(screen.getByText('Beta'));
    fireEvent.click(await findConfirmButton());

    expect(await screen.findAllByText('Updating your neurons to follow Beta...')).not.toHaveLength(
      0,
    );
    expect(mocks.setFollowing).toHaveBeenCalledOnce();
  });
});
