import { describe, expect, it } from 'vitest';

import { addCampaignParams, getCampaignParams, groupProposalPages } from './transformRequest';

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
    ).toBe('https://nns.internetcomputer.org/voting/proposals/:id');
    expect(
      groupProposalPages(payload('https://nns.internetcomputer.org/voting/proposals/7#votes')).u,
    ).toBe('https://nns.internetcomputer.org/voting/proposals/:id#votes');
  });

  it('does not change other pages', () => {
    const input = payload('https://nns.internetcomputer.org/voting?showProposals=true');
    expect(groupProposalPages(input)).toBe(input);
  });

  it('does not match a proposal path in the query or the hash', () => {
    for (const url of [
      'https://nns.internetcomputer.org/voting?back=/voting/proposals/123',
      'https://nns.internetcomputer.org/dashboard#/voting/proposals/123',
    ]) {
      const input = payload(url);
      expect(groupProposalPages(input)).toBe(input);
    }
  });

  it('does not change a path that only starts with a proposal ID', () => {
    for (const path of ['/voting/proposals/123abc', '/voting/proposals/123/extra']) {
      const input = payload(`https://nns.internetcomputer.org${path}`);
      expect(groupProposalPages(input)).toBe(input);
    }
  });
});

describe('getCampaignParams', () => {
  it('returns only the UTM parameters', () => {
    expect(
      getCampaignParams(
        '?redirect=/voting&utm_source=nns-dapp&utm_medium=modal&utm_content=banner',
      ),
    ).toEqual([
      ['utm_source', 'nns-dapp'],
      ['utm_medium', 'modal'],
      ['utm_content', 'banner'],
    ]);
  });

  it('skips an empty value', () => {
    expect(getCampaignParams('?utm_source=&utm_medium=modal')).toEqual([['utm_medium', 'modal']]);
  });

  it('returns nothing without UTM parameters', () => {
    expect(getCampaignParams('')).toEqual([]);
    expect(getCampaignParams('?redirect=/voting')).toEqual([]);
  });
});

describe('addCampaignParams', () => {
  const campaign: [string, string][] = [
    ['utm_source', 'nns-dapp'],
    ['utm_medium', 'modal'],
  ];

  it('adds the landing UTM parameters to a URL that lost them', () => {
    expect(
      addCampaignParams(payload('https://nns.internetcomputer.org/dashboard'), campaign).u,
    ).toBe('https://nns.internetcomputer.org/dashboard?utm_source=nns-dapp&utm_medium=modal');
  });

  it('keeps the other query parameters', () => {
    expect(
      addCampaignParams(payload('https://nns.internetcomputer.org/?redirect=%2Fvoting'), campaign)
        .u,
    ).toBe(
      'https://nns.internetcomputer.org/?redirect=%2Fvoting&utm_source=nns-dapp&utm_medium=modal',
    );
  });

  it('does not change a URL with its own UTM parameters', () => {
    const input = payload('https://nns.internetcomputer.org/?utm_source=forum');
    expect(addCampaignParams(input, campaign)).toBe(input);
  });

  it('does not change the payload without a campaign', () => {
    const input = payload('https://nns.internetcomputer.org/dashboard');
    expect(addCampaignParams(input, [])).toBe(input);
  });
});
