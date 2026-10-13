import '@/i18n/config';

import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROPOSAL_VOTING_ID } from '../utils';
import { ProposalJumpToVoteButton, ProposalJumpToVoteLink } from './ProposalJumpToVote';

// ─── Module mocks ────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  canVote: true,
  observerCallback: undefined as IntersectionObserverCallback | undefined,
}));

vi.mock('../hooks/useVoting', () => ({
  useVoting: () => ({ canVote: mocks.canVote }),
}));

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    mocks.observerCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

// ─── Helpers ─────────────────────────────────────────────────────

const proposal = {} as ProposalInfo;

const renderWithVoting = (ui: ReactNode) =>
  render(
    <>
      {ui}
      <div id={PROPOSAL_VOTING_ID} tabIndex={-1} />
    </>,
  );

const reportVoting = ({ isIntersecting, top }: { isIntersecting: boolean; top: number }) =>
  act(() =>
    mocks.observerCallback!(
      [{ isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );

const isShown = () => !screen.getByRole('link', { name: 'Vote' }).classList.contains('invisible');

// ─── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  mocks.canVote = true;
  mocks.observerCallback = undefined;
  scrollIntoView.mockClear();
});

describe('ProposalJumpToVoteLink', () => {
  it('renders nothing when the user cannot vote', () => {
    mocks.canVote = false;
    renderWithVoting(<ProposalJumpToVoteLink proposal={proposal} />);

    expect(screen.queryByRole('link', { name: 'Vote' })).toBeNull();
  });

  it('focuses and scrolls to the voting card on click', async () => {
    renderWithVoting(<ProposalJumpToVoteLink proposal={proposal} />);

    await userEvent.click(screen.getByRole('link', { name: 'Vote' }));

    expect(document.activeElement?.id).toBe(PROPOSAL_VOTING_ID);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('scrolls without animation when the user prefers reduced motion', async () => {
    vi.mocked(matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    renderWithVoting(<ProposalJumpToVoteLink proposal={proposal} />);

    await userEvent.click(screen.getByRole('link', { name: 'Vote' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});

describe('ProposalJumpToVoteButton', () => {
  it('renders nothing when the user cannot vote', () => {
    mocks.canVote = false;
    renderWithVoting(<ProposalJumpToVoteButton proposal={proposal} />);

    expect(screen.queryByRole('link', { name: 'Vote' })).toBeNull();
  });

  it('shows only while the voting card is below the viewport', () => {
    renderWithVoting(<ProposalJumpToVoteButton proposal={proposal} />);
    expect(isShown()).toBe(false);

    reportVoting({ isIntersecting: false, top: 1500 });
    expect(isShown()).toBe(true);

    reportVoting({ isIntersecting: true, top: 600 });
    expect(isShown()).toBe(false);

    reportVoting({ isIntersecting: false, top: -800 });
    expect(isShown()).toBe(false);
  });
});
