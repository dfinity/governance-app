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

  it('does not change other pages', () => {
    const input = payload('https://nns.internetcomputer.org/voting?showProposals=true');
    expect(groupProposalPages(input)).toBe(input);
  });
});
