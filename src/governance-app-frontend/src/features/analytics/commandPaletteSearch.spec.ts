import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNoResultReporter,
  maskSearchQuery,
  NO_RESULT_DELAY_MS,
} from './commandPaletteSearch';

describe('maskSearchQuery', () => {
  it('keeps plain words in lower case.', () => {
    expect(maskSearchQuery('  Export   CSV ')).toBe('export csv');
  });

  it('drops a query that is shorter than two characters.', () => {
    expect(maskSearchQuery('')).toBeUndefined();
    expect(maskSearchQuery(' x ')).toBeUndefined();
  });

  it('masks a word with a digit, for example an amount or a neuron ID.', () => {
    expect(maskSearchQuery('send 1.5 icp')).toBe('send # icp');
    expect(maskSearchQuery('neuron 1234567890123456789')).toBe('neuron #');
    expect(maskSearchQuery('€20')).toBe('#');
  });

  it('masks an account ID.', () => {
    expect(
      maskSearchQuery('d4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f'),
    ).toBe('#');
    expect(maskSearchQuery('abcdefabcdefabcdefabcdef')).toBe('*');
  });

  it('masks a principal and an email address.', () => {
    expect(maskSearchQuery('rrkah-fqaaa-aaaaa-aaaaq-cai')).toBe('*');
    expect(maskSearchQuery('aaaaa-aa')).toBe('*');
    expect(maskSearchQuery('mail me@example.com')).toBe('mail *');
  });

  it('keeps a word with a dash that is not a principal.', () => {
    expect(maskSearchQuery('non-constructive')).toBe('non-constructive');
    expect(maskSearchQuery('light-theme stake-all')).toBe('light-theme stake-all');
  });

  it('cuts the query to 40 characters.', () => {
    const masked = maskSearchQuery('word '.repeat(20));
    expect(masked).toHaveLength(39);
    expect(masked?.endsWith(' ')).toBe(false);
  });
});

describe('createNoResultReporter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a search with no result after a pause in typing.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('ex', false);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS - 1);
    reporter.update('exp', false);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS - 1);
    reporter.update('export', false);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    expect(send).toHaveBeenCalledExactlyOnceWith('export');
  });

  it('does not send a search with results.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('stak', false);
    reporter.update('stake', true);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    reporter.flush();

    expect(send).not.toHaveBeenCalled();
  });

  it('sends the pending search on flush.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('export', false);
    reporter.flush();
    expect(send).toHaveBeenCalledExactlyOnceWith('export');

    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    expect(send).toHaveBeenCalledOnce();
  });

  it('cancels the pending search when the search becomes empty.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('export', false);
    reporter.update('', true);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    reporter.flush();

    expect(send).not.toHaveBeenCalled();
  });

  it('sends the same query one time only.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('export', false);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    reporter.update('export', false);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);
    reporter.flush();

    expect(send).toHaveBeenCalledOnce();
  });

  it('sends the masked query.', () => {
    const send = vi.fn();
    const reporter = createNoResultReporter(send);

    reporter.update('send 25 icp', false);
    vi.advanceTimersByTime(NO_RESULT_DELAY_MS);

    expect(send).toHaveBeenCalledExactlyOnceWith('send # icp');
  });
});
