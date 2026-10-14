import '@/i18n/config';

import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProposalDetailsVoting } from './ProposalDetailsVoting';

// ─── Module mocks ────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  canVote: true,
  hasVoted: false,
  observer: undefined as
    | { callback: IntersectionObserverCallback; options?: IntersectionObserverInit }
    | undefined,
  resize: undefined as (() => void) | undefined,
}));

vi.mock('ic-use-internet-identity', () => ({
  useInternetIdentity: () => ({ identity: {} }),
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
  latestTally: { yes: 0n, no: 0n, total: 0n, timestampSeconds: 0n },
  ballots: [],
} as unknown as ProposalInfo;

const renderInMain = () => {
  const main = document.createElement('main');
  main.style.paddingBottom = '8px';
  document.body.appendChild(main);
  render(<ProposalDetailsVoting proposal={proposal} />, { container: main });
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

  it('ends the observed area at the bottom padding of main', () => {
    const main = renderInMain();

    expect(mocks.observer?.options).toMatchObject({ root: main, rootMargin: '0px 0px -8px 0px' });
  });

  it('follows the bottom padding of main when it changes', () => {
    const main = renderInMain();

    main.style.paddingBottom = '32px';
    act(() => mocks.resize!());

    expect(mocks.observer?.options).toMatchObject({ root: main, rootMargin: '0px 0px -32px 0px' });
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
});
