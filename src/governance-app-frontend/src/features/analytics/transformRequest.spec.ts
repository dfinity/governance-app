import { describe, expect, it } from 'vitest';

import {
  addCampaignParams,
  getCampaignParams,
  groupProposalPages,
  removeUrlParams,
} from './transformRequest';

const payload = (u: string, p?: Record<string, string>) => ({
  n: 'pageview',
  u,
  d: 'nns.internetcomputer.org',
  p,
});

describe('removeUrlParams', () => {
  const page = 'https://nns.internetcomputer.org/voting/proposals/7';

  it('removes the query and the hash of the page URL', () => {
    expect(removeUrlParams(payload(`${page}?neuronId=123&accountId=abc`)).u).toBe(page);
    expect(removeUrlParams(payload(`${page}#votes`)).u).toBe(page);
    expect(removeUrlParams(payload(`${page}?neuronId=123#votes`)).u).toBe(page);
  });

  it('does not change a URL without params', () => {
    expect(removeUrlParams(payload(page)).u).toBe(page);
  });

  it('removes a referrer from the same host', () => {
    const r = 'https://nns.internetcomputer.org/neurons?neuronId=999';
    expect(removeUrlParams({ ...payload(page), r }).r).toBeNull();
  });

  it('keeps an external referrer', () => {
    for (const r of [
      'https://forum.dfinity.org/',
      'https://www.google.com/search?q=nns',
      'https://sub.nns.internetcomputer.org/',
      'android-app://com.google.android.gm/',
    ]) {
      expect(removeUrlParams({ ...payload(page), r }).r).toBe(r);
    }
  });

  it('keeps an empty referrer', () => {
    expect(removeUrlParams({ ...payload(page), r: null }).r).toBeNull();
    expect(removeUrlParams(payload(page)).r).toBeUndefined();
  });

  it('keeps the other fields', () => {
    expect(removeUrlParams(payload(`${page}?neuronId=123`, { theme: 'dark' }))).toMatchObject({
      n: 'pageview',
      d: 'nns.internetcomputer.org',
      p: { theme: 'dark' },
    });
  });
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

  it('does not change the payload without a campaign', () => {
    const input = payload('https://nns.internetcomputer.org/dashboard');
    expect(addCampaignParams(input, [])).toBe(input);
  });
});
