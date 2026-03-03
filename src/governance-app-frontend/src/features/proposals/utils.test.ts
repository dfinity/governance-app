import { describe, expect, it } from 'vitest';

import { isProposalFilter, ProposalFilter, validateProposalsSearch } from './utils';

describe('isProposalFilter', () => {
  it('returns true for valid ProposalFilter values', () => {
    expect(isProposalFilter(ProposalFilter.Open)).toBe(true);
    expect(isProposalFilter(ProposalFilter.All)).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isProposalFilter('invalid')).toBe(false);
    expect(isProposalFilter('')).toBe(false);
    expect(isProposalFilter(undefined)).toBe(false);
    expect(isProposalFilter(null)).toBe(false);
    expect(isProposalFilter(123)).toBe(false);
    expect(isProposalFilter(true)).toBe(false);
  });
});

describe('validateProposalsSearch', () => {
  describe('showProposals', () => {
    it('returns true when showProposals is boolean true', () => {
      expect(validateProposalsSearch({ showProposals: true })).toMatchObject({
        showProposals: true,
      });
    });

    it('returns true when showProposals is string "true"', () => {
      expect(validateProposalsSearch({ showProposals: 'true' })).toMatchObject({
        showProposals: true,
      });
    });

    it('returns undefined when showProposals is false', () => {
      expect(validateProposalsSearch({ showProposals: false }).showProposals).toBeUndefined();
    });

    it('returns undefined when showProposals is missing', () => {
      expect(validateProposalsSearch({}).showProposals).toBeUndefined();
    });

    it('returns undefined for non-boolean/non-"true" values', () => {
      expect(validateProposalsSearch({ showProposals: 'false' }).showProposals).toBeUndefined();
      expect(validateProposalsSearch({ showProposals: 1 }).showProposals).toBeUndefined();
      expect(validateProposalsSearch({ showProposals: 'yes' }).showProposals).toBeUndefined();
    });
  });

  describe('proposalFilter', () => {
    it('returns the value when proposalFilter is "open"', () => {
      expect(validateProposalsSearch({ proposalFilter: 'open' }).proposalFilter).toBe(
        ProposalFilter.Open,
      );
    });

    it('returns the value when proposalFilter is "all"', () => {
      expect(validateProposalsSearch({ proposalFilter: 'all' }).proposalFilter).toBe(
        ProposalFilter.All,
      );
    });

    it('defaults to Open when proposalFilter is missing', () => {
      expect(validateProposalsSearch({}).proposalFilter).toBe(ProposalFilter.Open);
    });

    it('defaults to Open for invalid proposalFilter values', () => {
      expect(validateProposalsSearch({ proposalFilter: 'invalid' }).proposalFilter).toBe(
        ProposalFilter.Open,
      );
      expect(validateProposalsSearch({ proposalFilter: 123 }).proposalFilter).toBe(
        ProposalFilter.Open,
      );
      expect(validateProposalsSearch({ proposalFilter: true }).proposalFilter).toBe(
        ProposalFilter.Open,
      );
      expect(validateProposalsSearch({ proposalFilter: null }).proposalFilter).toBe(
        ProposalFilter.Open,
      );
    });
  });

  describe('combined', () => {
    it('parses both params together', () => {
      expect(validateProposalsSearch({ showProposals: true, proposalFilter: 'all' })).toEqual({
        showProposals: true,
        proposalFilter: ProposalFilter.All,
      });
    });

    it('returns defaults for empty input', () => {
      expect(validateProposalsSearch({})).toEqual({
        showProposals: undefined,
        proposalFilter: ProposalFilter.Open,
      });
    });
  });
});
