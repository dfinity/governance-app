import '@/i18n/config';

import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Vote } from '@icp-sdk/canisters/nns';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProposalDetailsVoting } from './ProposalDetailsVoting';

// ─── Module mocks ────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  canVote: true,
  hasVoted: false,
  identity: {} as object | undefined,
  canLogin: true,
  isLoggingIn: false,
  login: vi.fn(),
  setLoginSource: vi.fn(),
  observer: undefined as
    | { callback: IntersectionObserverCallback; options?: IntersectionObserverInit }
    | undefined,
  resize: undefined as (() => void) | undefined,
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: mocks.identity,
    canLogin: mocks.canLogin,
    isLoggingIn: mocks.isLoggingIn,
    login: mocks.login,
  }),
}));

vi.mock('@features/analytics/useLoginAnalytics', () => ({
  setLoginSource: mocks.setLoginSource,
}));

vi.mock('../hooks/useVoting', () => ({
  useVoting: () => ({
    vote: vi.fn(),
    isVoting: false,
    canVote: mocks.canVote,
    hasVoted: mocks.hasVoted,
    isVoteMixed: false,
    voteValue: mocks.hasVoted ? Vote.Yes : Vote.Unspecified,
  }),
}));

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    mocks.observer = { callback, options };
  }
  observe = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

class FakeResizeObserver {
  constructor(callback: () => void) {
    mocks.resize = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

// ─── Helpers ─────────────────────────────────────────────────────

const proposal = {
  id: 1n,
  status: ProposalStatus.Open,
  rewardStatus: ProposalRewardStatus.AcceptVotes,
  deadlineTimestampSeconds: BigInt(Math.floor(Date.now() / 1000) + 3600),
  latestTally: {
    yes: 3n * 100_000_000n,
    no: 1n * 100_000_000n,
    total: 4n * 100_000_000n,
    timestampSeconds: 0n,
  },
  ballots: [],
} as unknown as ProposalInfo;

const renderInMain = (props: Partial<ProposalInfo> = {}) => {
  const main = document.createElement('main');
  main.style.paddingBottom = '8px';
  document.body.appendChild(main);
  render(<ProposalDetailsVoting proposal={{ ...proposal, ...props }} />, { container: main });
  return main;
};

const reportSentinelTop = (top: number) =>
  act(() =>
    mocks.observer!.callback(
      [{ boundingClientRect: { top }, rootBounds: { bottom: 800 } } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );

const footerState = () =>
  screen
    .getByRole('button', { name: 'Vote Yes on proposal 1' })
    .closest('[data-state]')
    ?.getAttribute('data-state');

// ─── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  mocks.canVote = true;
  mocks.hasVoted = false;
  mocks.identity = {};
  mocks.canLogin = true;
  mocks.isLoggingIn = false;
  mocks.login.mockClear();
  mocks.setLoginSource.mockClear();
  mocks.observer = undefined;
  mocks.resize = undefined;
});

describe('ProposalDetailsVoting', () => {
  it('docks the vote buttons under the card by default', () => {
    renderInMain();

    expect(footerState()).toBe('docked');
  });

  it('floats the vote buttons only while the card is below the scroll area', () => {
    renderInMain();

    reportSentinelTop(1200);
    expect(footerState()).toBe('floating');

    reportSentinelTop(600);
    expect(footerState()).toBe('docked');

    reportSentinelTop(-300);
    expect(footerState()).toBe('docked');
  });

  it('docks the vote buttons when the card ends exactly at the scroll area', () => {
    renderInMain();

    reportSentinelTop(1200);
    reportSentinelTop(800);
    expect(footerState()).toBe('docked');
  });

  it('ends the observed area at the bottom padding of main', () => {
    const main = renderInMain();

    expect(mocks.observer?.options).toMatchObject({
      root: main,
      rootMargin: '100000px 0px -8px 0px',
    });
  });

  it('follows the bottom padding of main when it changes', () => {
    const main = renderInMain();

    main.style.paddingBottom = '32px';
    act(() => mocks.resize!());

    expect(mocks.observer?.options).toMatchObject({
      root: main,
      rootMargin: '100000px 0px -32px 0px',
    });
  });

  it('shows no vote buttons when the user cannot vote', () => {
    mocks.canVote = false;
    renderInMain();

    expect(screen.queryByRole('button', { name: 'Vote Yes on proposal 1' })).toBeNull();
    expect(document.querySelector('[data-state]')).toBeNull();
  });

  it('shows the cast vote inside the card without a docking footer', () => {
    mocks.canVote = false;
    mocks.hasVoted = true;
    renderInMain();

    expect(screen.getByText('Yes', { selector: 'strong' })).toBeTruthy();
    expect(document.querySelector('[data-state]')).toBeNull();
  });

  describe('signed out', () => {
    beforeEach(() => {
      mocks.identity = undefined;
      mocks.canVote = false;
    });

    it('shows the tally and a login in place of the vote buttons', () => {
      renderInMain();

      expect(screen.getByText('Yes: 75.00%')).toBeTruthy();
      expect(screen.getByText('Log in to vote with your neurons.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Vote Yes on proposal 1' })).toBeNull();
      expect(document.querySelector('[data-state]')).toBeNull();
    });

    it('starts the login from the vote row', () => {
      renderInMain();

      fireEvent.click(screen.getByRole('button', { name: 'Log in to vote' }));

      expect(mocks.setLoginSource).toHaveBeenCalledWith('reader_vote_row');
      expect(mocks.login).toHaveBeenCalledTimes(1);
    });

    it('disables the login during a logout', () => {
      mocks.canLogin = false;
      renderInMain();

      expect(
        (screen.getByRole('button', { name: 'Log in to vote' }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('starts a waiting login again on a second click', () => {
      mocks.canLogin = false;
      mocks.isLoggingIn = true;
      renderInMain();

      const button = screen.getByRole('button', { name: 'Log in to vote' });
      expect(button.getAttribute('aria-busy')).toBe('true');
      fireEvent.click(button);

      expect(mocks.login).toHaveBeenCalledTimes(1);
    });

    it('shows the login for an adopted proposal that still takes votes', () => {
      renderInMain({ status: ProposalStatus.Executed });

      expect(screen.getByRole('button', { name: 'Log in to vote' })).toBeTruthy();
    });

    it('shows no login once the proposal takes no votes', () => {
      renderInMain({ rewardStatus: ProposalRewardStatus.Settled });

      expect(screen.getByText('Yes: 75.00%')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Log in to vote' })).toBeNull();
    });

    it('shows no login after the deadline', () => {
      renderInMain({ deadlineTimestampSeconds: BigInt(Math.floor(Date.now() / 1000) - 1) });

      expect(screen.queryByRole('button', { name: 'Log in to vote' })).toBeNull();
    });

    it('does not show a cast vote', () => {
      mocks.hasVoted = true;
      renderInMain();

      expect(screen.queryByText('Yes', { selector: 'strong' })).toBeNull();
    });
  });

  it('shows no login row to a signed-in user', () => {
    renderInMain();

    expect(screen.queryByRole('button', { name: 'Log in to vote' })).toBeNull();
  });
});
