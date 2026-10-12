import { describe, expect, it } from 'vitest';

import { groupProposalPages } from './transformRequest';

const payload = (u: string, p?: Record<string, string>) => ({
  n: 'pageview',
  u,
  d: 'nns.internetcomputer.org',
  p,
});

describe('groupProposalPages', () => {
  it('replaces the proposal ID in the URL and keeps it as a property', () => {
    const result = groupProposalPages(
      payload('https://nns.internetcomputer.org/voting/proposals/144002?proposalFilter=open'),
    );
    expect(result.u).toBe(
      'https://nns.internetcomputer.org/voting/proposals/:id?proposalFilter=open',
    );
    expect(result.p).toEqual({ proposal_id: '144002' });
  });

  it('keeps the existing properties', () => {
    const result = groupProposalPages(
      payload('https://nns.internetcomputer.org/voting/proposals/7', { theme: 'dark' }),
    );
    expect(result.p).toEqual({ theme: 'dark', proposal_id: '7' });
  });

  it('accepts a trailing slash and a hash', () => {
    expect(
      groupProposalPages(payload('https://nns.internetcomputer.org/voting/proposals/7/')).u,
    ).toBe('https://nns.internetcomputer.org/voting/proposals/:id/');
    expect(
      groupProposalPages(payload('https://nns.internetcomputer.org/voting/proposals/7#votes')).u,
    ).toBe('https://nns.internetcomputer.org/voting/proposals/:id#votes');
  });

  it('does not change other pages', () => {
    const input = payload('https://nns.internetcomputer.org/voting?showProposals=true');
    expect(groupProposalPages(input)).toBe(input);
  });

  it('does not change a path that only starts with a proposal ID', () => {
    for (const path of ['/voting/proposals/123abc', '/voting/proposals/123/extra']) {
      const input = payload(`https://nns.internetcomputer.org${path}`);
      expect(groupProposalPages(input)).toBe(input);
    }
  });
});
